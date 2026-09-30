import { describe, it, expect } from 'vitest';
import { LineageBranchingEngine } from '../src/engines/branching';
import { LoreEntity } from '../src/types/domain';
import { AnglicizationEngine } from '../src/engines/anglicize';
import { cultures } from '../src/data/cultures';
import { MarkovNameGenerator } from '../src/engines/markov';

describe('LineageBranchingEngine', () => {
  const branching = new LineageBranchingEngine();

  describe('Core Acceptance Tests', () => {
    it('branches Settlement into City Wards inheriting parent root', () => {
      const metropolis: LoreEntity = {
        id: 'city-1',
        name: 'Braila',
        originalName: 'Braila',
        rootName: 'Braila',
        originalRoot: 'Braila',
        category: 'settlement',
        cultureId: 'danubian_slavic',
        children: [],
        metadata: { subtype: 'Metropolis' },
        createdAt: Date.now(),
      };

      const wards = branching.branchChildren(metropolis, 'City Ward', 3);
      expect(wards.length).toBe(3);
      expect(wards[0].parentId).toBe('city-1');
      expect(wards[0].name).toContain('Braila');
      expect(wards[0].category).toBe('settlement');
      expect(metropolis.children?.length).toBe(3);
    });

    it('branches Geography across 4-tier model (Macro Region -> Mountains -> Passes)', () => {
      const region: LoreEntity = {
        id: 'reg-1',
        name: 'The Great Danubian Reach',
        originalName: 'The Great Danubian Reach',
        rootName: 'Danubia',
        originalRoot: 'Danubia',
        category: 'geography',
        cultureId: 'danubian_slavic',
        children: [],
        metadata: { subtype: 'Macro Region', tier: 1 },
        createdAt: Date.now(),
      };

      const ranges = branching.branchChildren(region, 'Mountain Range', 1);
      expect(ranges.length).toBe(1);
      expect(ranges[0].parentId).toBe('reg-1');
      expect(ranges[0].featureSubtype).toBe('orogeny');

      const passes = branching.branchChildren(ranges[0], 'Mountain Pass', 2);
      expect(passes.length).toBe(2);
      expect(passes[0].parentId).toBe(ranges[0].id);
      expect(passes[0].featureSubtype).toBe('orogeny');
    });

    it('lists available branch subtypes per parent category/subtype', () => {
      const faction: LoreEntity = {
        id: 'fac-1',
        name: 'The Iron Circle',
        originalName: 'The Iron Circle',
        rootName: 'Iron',
        originalRoot: 'Iron',
        category: 'faction',
        cultureId: 'celtic_gaelic',
        metadata: { subtype: 'Military Legion' },
      };
      const subtypes = branching.getAvailableBranchSubtypes(faction);
      expect(subtypes.length).toBeGreaterThan(0);
      expect(subtypes).toContain('Grandmaster');
      expect(subtypes).toContain('Chapterhouse');
      expect(subtypes).toContain('Initiate Rank');
      expect(subtypes).toContain('Envoy');
      expect(subtypes).toContain('Faction Relic');
    });

    describe('Branching regression boundaries', () => {
      const parent: LoreEntity = {
        id: 'canonical', name: 'Jan', originalName: 'Jan', originalRoot: 'Jan',
        rootName: 'Jan', category: 'settlement', cultureId: 'danubian_slavic',
      };
      it('builds canonical children and descendants from originals, independent of display overlays', () => {
        const overlay = new AnglicizationEngine();
        const displayed = overlay.anglicizeEntity(parent, { mode: 'full' });
        expect(displayed.name).not.toBe(parent.name);
        const engine = new LineageBranchingEngine({ randomFn: () => 0 });
        const [plain] = engine.branchChildren(displayed, 'City Ward', 1, { anglicize: false });
        const [translated] = engine.branchChildren(displayed, 'City Ward', 1, { anglicize: true });
        expect(plain.name).toBe('Jan Ward');
        expect(plain.originalName).toBe('Jan Ward');
        expect(plain.rootName).toBe('Jan');
        expect(translated.originalName).toBe(plain.originalName);
        expect(translated.originalRoot).toBe('Jan');
        expect(overlay.revert(translated).name).toBe('Jan Ward');
        const [descendant] = engine.branchChildren(translated, 'High Gate', 1, { anglicize: false });
        expect(descendant.originalName).toBe('Gate of Jan');
        const [shrine] = engine.branchChildren(displayed, 'Shrine', 1, { anglicize: false });
        expect(shrine.originalName).toBe('Shrine of Jan');
      });

      it('prioritizes explicit categories and geographic tiers over incidental subtype text', () => {
        const engine = new LineageBranchingEngine();
        for (const subtype of ['Local Guildhall', 'Riverfront Settlement', 'Order Town']) {
          expect(engine.getAvailableBranchSubtypes({ ...parent, subtype })).toContain('City Ward');
        }
        expect(engine.getAvailableBranchSubtypes({
          ...parent, category: 'character', subtype: 'Military Legion',
        })).toContain('Heir');
        expect(engine.getAvailableBranchSubtypes({
          ...parent, category: 'geography', subtype: 'Border Wetlands',
        })).toContain('Grove');
        expect(engine.getAvailableBranchSubtypes({
          ...parent, category: 'geography', subtype: 'River', featureSubtype: 'hydrology', metadata: { tier: 2 },
        })).toContain('Mountain Pass');
      });

      it('keys cached models by actual seeds, multiplicity, gender pool and order and bounds retention', () => {
        const engine = new LineageBranchingEngine({ randomFn: () => 0 });
        const culture = structuredClone(cultures.danubian_slavic);
        culture.seeds.given_names_masculine = ['Amber'];
        culture.seeds.given_names_feminine = ['Elora'];
        const generate = (gender: 'masculine' | 'feminine', markovOrder = 2) =>
          engine.branchChildren(parent, 'Household Guard', 1, { culture, gender, markovOrder })[0].name;
        expect(generate('masculine')).toBe('Amber, Guard of Jan');
        expect(generate('feminine')).toBe('Elora, Guard of Jan');
        culture.seeds.given_names_masculine = ['Orina', 'Orina'];
        expect(generate('masculine', 3)).toBe('Orina, Guard of Jan');
        const cache = (engine as unknown as { markovCache: Map<string, MarkovNameGenerator> }).markovCache;
        expect([...cache.values()].some((model) => model.order === 3 && model.transitions.get('^^^')?.get('o') === 2)).toBe(true);
        for (let i = 0; i < 80; i++) {
          culture.seeds.given_names_masculine = [`Amber${i}`];
          generate('masculine');
        }
        expect(cache.size).toBeLessThanOrEqual(64);
      });

      it('passes seeded RNG through branch templates and Markov sampling, including warmed caches', () => {
        const rng = () => {
          let state = 123;
          return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
        };
        const engine = new LineageBranchingEngine();
        const first = engine.branchChildren(parent, 'Household Guard', 9, { randomFn: rng() });
        const second = engine.branchChildren(parent, 'Household Guard', 9, { randomFn: rng() });
        expect(first.map((child) => child.name)).toEqual(second.map((child) => child.name));
        const other = new LineageBranchingEngine({ randomFn: rng() });
        expect(other.branchChildren(parent, 'Household Guard', 9).map((child) => child.name))
          .toEqual(first.map((child) => child.name));
      });
    });
  });

  describe('Settlement Lineage Rules', () => {
    it('branches into Harbor Quarters, High Gates, Catacombs, and Local Guildhalls', () => {
      const fortress: LoreEntity = {
        id: 'fort-1',
        name: 'Krakov',
        originalName: 'Krakov',
        rootName: 'Krakov',
        originalRoot: 'Krakov',
        category: 'settlement',
        cultureId: 'danubian_slavic',
        children: [],
        metadata: { subtype: 'Fortress' },
      };

      const quarters = branching.branchChildren(fortress, 'Harbor Quarter', 1);
      const gates = branching.branchChildren(fortress, 'High Gate', 1);
      const catacombs = branching.branchChildren(fortress, 'Catacombs', 1);
      const guildhalls = branching.branchChildren(fortress, 'Local Guildhall', 1);

      expect(quarters[0].name).toContain('Krakov');
      expect(gates[0].name).toContain('Krakov');
      expect(catacombs[0].name).toContain('Krakov');
      expect(guildhalls[0].name).toContain('Krakov');

      expect(quarters[0].category).toBe('settlement');
      expect(gates[0].category).toBe('settlement');
      expect(catacombs[0].category).toBe('settlement');
      expect(guildhalls[0].category).toBe('settlement');
    });
  });

  describe('People / Character Lineage Rules', () => {
    it('branches Noble/Officer into Household Guard, Lieutenants, Squires, Heirs, Spouse, Patronymic lineage', () => {
      const noble: LoreEntity = {
        id: 'char-1',
        name: 'Voivode Radu',
        originalName: 'Voivode Radu',
        rootName: 'Radu',
        originalRoot: 'Radu',
        category: 'character',
        cultureId: 'danubian_slavic',
        children: [],
        metadata: { subtype: 'Noble' },
      };

      const guard = branching.branchChildren(noble, 'Household Guard', 1);
      const lt = branching.branchChildren(noble, 'Lieutenant', 1);
      const squire = branching.branchChildren(noble, 'Squire', 1);
      const heir = branching.branchChildren(noble, 'Heir', 1);
      const spouse = branching.branchChildren(noble, 'Spouse', 1);
      const kin = branching.branchChildren(noble, 'Patronymic Lineage', 1);

      expect(guard[0].category).toBe('character');
      expect(guard[0].parentId).toBe('char-1');
      expect(lt[0].category).toBe('character');
      expect(squire[0].category).toBe('character');
      expect(heir[0].category).toBe('character');
      expect(spouse[0].category).toBe('character');
      expect(kin[0].category).toBe('character');

      // Heir / kin in Slavic should inherit or feature root
      expect(heir[0].name).toBeDefined();
      expect(heir[0].rootName).toBe('Radu');
    });

    it('generates culturally appropriate patronymics for Celtic heirs', () => {
      const gaelicLord: LoreEntity = {
        id: 'celt-1',
        name: 'Morann',
        originalName: 'Morann',
        rootName: 'Morann',
        originalRoot: 'Morann',
        category: 'character',
        cultureId: 'celtic_gaelic',
        metadata: { subtype: 'Noble' },
      };

      const heirs = branching.branchChildren(gaelicLord, 'Heir', 2);
      expect(heirs[0].name).toMatch(/mac Morann|nic Morann|Morann/);
    });

    it('generates culturally appropriate patronymics for Nordic heirs', () => {
      const jarl: LoreEntity = {
        id: 'nord-1',
        name: 'Ragnar',
        originalName: 'Ragnar',
        rootName: 'Ragnar',
        originalRoot: 'Ragnar',
        category: 'character',
        cultureId: 'nordic_scandian',
        metadata: { subtype: 'Noble' },
      };

      const heirs = branching.branchChildren(jarl, 'Heir', 2);
      expect(heirs[0].name).toMatch(/Ragnarsson|Ragnarsdottir|Ragnar/);
    });
  });

  describe('4-Tier Geographic Hierarchy', () => {
    it('branches Tier 1 Macro Region into Basins, River Basins, Wetlands, and Woods', () => {
      const region: LoreEntity = {
        id: 'geo-1',
        name: 'The Great Reach',
        originalName: 'The Great Reach',
        rootName: 'Reach',
        originalRoot: 'Reach',
        category: 'geography',
        cultureId: 'danubian_slavic',
        metadata: { subtype: 'Macro Region', tier: 1 },
      };

      const basins = branching.branchChildren(region, 'Interior Basin', 1);
      const rivers = branching.branchChildren(region, 'Primary River Basin', 1);
      const wetlands = branching.branchChildren(region, 'Border Wetlands', 1);
      const woods = branching.branchChildren(region, 'Primeval Woods', 1);

      expect(basins[0].metadata?.tier).toBe(2);
      expect(rivers[0].metadata?.tier).toBe(3);
      expect(wetlands[0].metadata?.tier).toBe(4);
      expect(woods[0].metadata?.tier).toBe(4);

      expect(basins[0].name).toContain('Reach');
      expect(rivers[0].name).toContain('Reach');
      expect(wetlands[0].name).toContain('Reach');
      expect(woods[0].name).toContain('Reach');
    });

    it('branches Tier 2 Mountains into Peaks, Canyons, and Gorges', () => {
      const range: LoreEntity = {
        id: 'mt-1',
        name: 'Iron Peaks',
        originalName: 'Iron Peaks',
        rootName: 'Iron',
        originalRoot: 'Iron',
        category: 'geography',
        featureSubtype: 'orogeny',
        cultureId: 'celtic_gaelic',
        metadata: { subtype: 'Mountain Range', tier: 2 },
      };

      const peak = branching.branchChildren(range, 'Individual Peak', 1);
      const canyon = branching.branchChildren(range, 'Canyon', 1);
      const gorge = branching.branchChildren(range, 'Gorge', 1);

      expect(peak[0].parentId).toBe('mt-1');
      expect(canyon[0].parentId).toBe('mt-1');
      expect(gorge[0].parentId).toBe('mt-1');
      expect(peak[0].featureSubtype).toBe('orogeny');
    });

    it('branches Tier 3 Hydrology into Fords, Tributaries, Delta Basins, and Riverfront Settlements', () => {
      const river: LoreEntity = {
        id: 'riv-1',
        name: 'Dunava',
        originalName: 'Dunava',
        rootName: 'Dunava',
        originalRoot: 'Dunava',
        category: 'geography',
        featureSubtype: 'hydrology',
        cultureId: 'danubian_slavic',
        metadata: { subtype: 'Primary River Basin', tier: 3 },
      };

      const ford = branching.branchChildren(river, 'River Ford', 1);
      const trib = branching.branchChildren(river, 'Tributary', 1);
      const delta = branching.branchChildren(river, 'Delta Basin', 1);
      const settlement = branching.branchChildren(river, 'Riverfront Settlement', 1);

      expect(ford[0].category).toBe('geography');
      expect(trib[0].category).toBe('geography');
      expect(delta[0].category).toBe('geography');
      expect(settlement[0].category).toBe('settlement');
      expect(settlement[0].name).toContain('Dunava');
    });

    it('branches Tier 4 Wilds into Groves, Ancient Caves, Waystations, and Hollows', () => {
      const forest: LoreEntity = {
        id: 'for-1',
        name: 'Shadow Weald',
        originalName: 'Shadow Weald',
        rootName: 'Shadow',
        originalRoot: 'Shadow',
        category: 'geography',
        featureSubtype: 'wilds',
        cultureId: 'nordic_scandian',
        metadata: { subtype: 'Primeval Woods', tier: 4 },
      };

      const grove = branching.branchChildren(forest, 'Grove', 1);
      const cave = branching.branchChildren(forest, 'Ancient Cave', 1);
      const waystation = branching.branchChildren(forest, 'Waystation', 1);
      const hollow = branching.branchChildren(forest, 'Hollow', 1);

      expect(grove[0].featureSubtype).toBe('wilds');
      expect(cave[0].featureSubtype).toBe('wilds');
      expect(waystation[0].category).toBe('settlement');
      expect(hollow[0].featureSubtype).toBe('wilds');
      expect(grove[0].name).toContain('Shadow');
    });
  });

  describe('Faction & Artifact Lineage Rules', () => {
    it('branches Factions into Grandmaster, Chapterhouses, Initiate ranks, Envoys, and Relics', () => {
      const guild: LoreEntity = {
        id: 'guild-1',
        name: 'The Golden Ledger',
        originalName: 'The Golden Ledger',
        rootName: 'Golden',
        originalRoot: 'Golden',
        category: 'character',
        cultureId: 'levantine_semitic',
        metadata: { subtype: 'Mercantile Guild' },
      };

      const grandmaster = branching.branchChildren(guild, 'Grandmaster', 1);
      const chapterhouse = branching.branchChildren(guild, 'Chapterhouse', 1);
      const initiate = branching.branchChildren(guild, 'Initiate Rank', 1);
      const envoy = branching.branchChildren(guild, 'Envoy', 1);
      const relic = branching.branchChildren(guild, 'Faction Relic', 1);

      expect(grandmaster[0].category).toBe('character');
      expect(chapterhouse[0].category).toBe('settlement');
      expect(initiate[0].category).toBe('character');
      expect(envoy[0].category).toBe('character');
      expect(relic[0].category).toBe('artifact');

      expect(chapterhouse[0].name).toContain('Golden');
    });

    it('branches Artifacts into Bound Bearer, Shrine of Consecration, and Vault of Consecration', () => {
      const sword: LoreEntity = {
        id: 'art-1',
        name: 'Suncleaver',
        originalName: 'Suncleaver',
        rootName: 'Suncleaver',
        originalRoot: 'Suncleaver',
        category: 'character',
        cultureId: 'greco_aegean',
        metadata: { subtype: 'Martial Weapon' },
      };

      const bearer = branching.branchChildren(sword, 'Bound Bearer', 1);
      const shrine = branching.branchChildren(sword, 'Shrine of Consecration', 1);
      const vault = branching.branchChildren(sword, 'Vault of Consecration', 1);

      expect(bearer[0].category).toBe('character');
      expect(shrine[0].category).toBe('settlement');
      expect(vault[0].category).toBe('settlement');

      expect(bearer[0].parentId).toBe('art-1');
      expect(shrine[0].name).toContain('Suncleaver');
      expect(vault[0].name).toContain('Suncleaver');
    });
  });

  describe('Anglicization and Options Integration', () => {
    it('applies Anglicization overlay when option is enabled', () => {
      const city: LoreEntity = {
        id: 'city-2',
        name: 'Szczecin',
        originalName: 'Szczecin',
        rootName: 'Szczecin',
        originalRoot: 'Szczecin',
        category: 'settlement',
        cultureId: 'danubian_slavic',
        createdAt: Date.now(),
      };

      const wards = branching.branchChildren(city, 'City Ward', 1, {
        anglicize: true,
        anglicizeMode: 'full',
      });

      expect(wards.length).toBe(1);
      expect(wards[0].anglicization?.enabled).toBe(true);
      // 'Szczecin' should be anglicized ('Sch...' or phonetic smoothing)
      expect(wards[0].name).not.toContain('Szczecin');
      expect(wards[0].originalName).toContain('Szczecin');
    });

    it('auto-branches when subtype is "auto" or undefined', () => {
      const metropolis: LoreEntity = {
        id: 'city-3',
        name: 'Byzantion',
        originalName: 'Byzantion',
        rootName: 'Byzantion',
        originalRoot: 'Byzantion',
        category: 'settlement',
        cultureId: 'greco_aegean',
      };

      const autoChildren = branching.branchChildren(metropolis, 'auto', 2);
      expect(autoChildren.length).toBe(2);
      expect(autoChildren[0].parentId).toBe('city-3');
      expect(autoChildren[0].category).toBe('settlement');
    });
  });

  describe('Edge Cases and Defensive Robustness', () => {
    it('throws descriptive error on invalid or empty parent', () => {
      expect(() => branching.branchChildren(null as unknown as LoreEntity, 'City Ward')).toThrowError(
        /parent entity must have valid id and name/
      );
      expect(() => branching.branchChildren({} as unknown as LoreEntity, 'City Ward')).toThrowError(
        /parent entity must have valid id and name/
      );
    });

    it('gracefully handles missing/unregistered cultureId with fallback templates', () => {
      const parent: LoreEntity = {
        id: 'unknown-1',
        name: 'Lost Haven',
        originalName: 'Lost Haven',
        rootName: 'Lost Haven',
        originalRoot: 'Lost Haven',
        category: 'settlement',
        cultureId: 'nonexistent_culture',
      };

      const children = branching.branchChildren(parent, 'City Ward', 2);
      expect(children.length).toBe(2);
      expect(children[0].parentId).toBe('unknown-1');
      expect(children[0].name).toContain('Lost Haven');
    });

    it('synthesizes sensible fallback for novel/unrecognized child subtype', () => {
      const parent: LoreEntity = {
        id: 'cit-1',
        name: 'Ironhold',
        originalName: 'Ironhold',
        rootName: 'Ironhold',
        originalRoot: 'Ironhold',
        category: 'settlement',
        cultureId: 'celtic_gaelic',
      };

      const children = branching.branchChildren(parent, 'Alchemy Foundry', 2);
      expect(children.length).toBe(2);
      expect(children[0].subtype).toBe('Alchemy Foundry');
      expect(children[0].name).toContain('Ironhold');
    });

    it('handles bulk generation exceeding template count without crash or duplicates', () => {
      const parent: LoreEntity = {
        id: 'mega-1',
        name: 'Corinth',
        originalName: 'Corinth',
        rootName: 'Corinth',
        originalRoot: 'Corinth',
        category: 'settlement',
        cultureId: 'greco_aegean',
      };

      const children = branching.branchChildren(parent, 'City Ward', 15);
      expect(children.length).toBe(15);
      // All children should have distinct IDs and valid names
      const ids = new Set(children.map((c) => c.id));
      expect(ids.size).toBe(15);
    });
  });
});
