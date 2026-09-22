import { describe, it, expect } from 'vitest';
import {
  deriveVariationsFromRoots,
  formatPrefix,
  formatSuffix,
  prepareCustomGenerationContext,
} from '../src/engines/vocabulary';
import { cultures } from '../src/data/cultures';
import { RecursiveGrammarEngine } from '../src/engines/grammar';
import { MarkovNameGenerator } from '../src/engines/markov';

describe('Custom Vocabulary & Seed Lexicon Derivation Engine', () => {
  describe('formatPrefix', () => {
    it('formats prepositional and standalone word prefixes with spacing', () => {
      expect(formatPrefix('Von')).toBe('Von ');
      expect(formatPrefix('De')).toBe('De ');
      expect(formatPrefix('San')).toBe('San ');
      expect(formatPrefix('New')).toBe('New ');
      expect(formatPrefix('Old')).toBe('Old ');
      expect(formatPrefix('Fort')).toBe('Fort ');
      expect(formatPrefix('Port')).toBe('Port ');
    });

    it('preserves hyphens and apostrophes without unwanted spaces', () => {
      expect(formatPrefix('Al-')).toBe('Al-');
      expect(formatPrefix('Fort-')).toBe('Fort-');
      expect(formatPrefix("O'")).toBe("O'");
      expect(formatPrefix('Mac-')).toBe('Mac-');
    });

    it('handles empty or combining prefixes gracefully', () => {
      expect(formatPrefix('')).toBe('');
      expect(formatPrefix('Belo')).toBe('Belo');
      expect(formatPrefix('Staro')).toBe('Staro');
    });
  });

  describe('formatSuffix', () => {
    it('strips leading hyphens from attaching suffixes', () => {
      expect(formatSuffix('-grad')).toBe('grad');
      expect(formatSuffix('-ford')).toBe('ford');
      expect(formatSuffix('-by')).toBe('by');
      expect(formatSuffix('-stead')).toBe('stead');
      expect(formatSuffix('-haven')).toBe('haven');
      expect(formatSuffix('-burg')).toBe('burg');
      expect(formatSuffix('-ville')).toBe('ville');
    });

    it('adds leading space for standalone toponymic words without hyphen', () => {
      expect(formatSuffix('Ward')).toBe(' Ward');
      expect(formatSuffix('Quarter')).toBe(' Quarter');
      expect(formatSuffix('Reach')).toBe(' Reach');
    });
  });

  describe('deriveVariationsFromRoots', () => {
    it('generates rich given names starting from the seed root rather than regurgitating the raw root', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.givenNames.length).toBeGreaterThan(5);
      // Ensure all given names start with the root stem
      for (const name of result.givenNames) {
        expect(name.toLowerCase().startsWith('valer')).toBe(true);
      }
      // Ensure it is NOT just the bare root
      const hasExpandedName = result.givenNames.some((n) => n.length > 'Valer'.length);
      expect(hasExpandedName).toBe(true);
      expect(result.givenNames).toContain('Valerik');
      expect(result.givenNames).toContain('Valerian');
    });

    it('generates derived patronymic and locative surnames from the seed root', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.surnames.length).toBeGreaterThan(4);
      expect(result.surnames).toContain('Valerov');
      expect(result.surnames).toContain('Valerovic');
      expect(result.surnames).toContain('Valerski');
    });

    it('generates derived settlement compounds rather than bare roots', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.settlementNames.length).toBeGreaterThan(5);
      expect(result.settlementNames).toContain('Valergrad');
      expect(result.settlementNames).toContain('Valerovo');
      expect(result.settlementNames).toContain('Stari Valer');
      // Must not contain bare "Valer" as a full settlement name
      expect(result.settlementNames).not.toContain('Valer');
    });

    it('generates geographic, faction, and artifact variations from the seed root', () => {
      const result = deriveVariationsFromRoots(['Khor'], 'nordic_scandian');

      expect(result.stems).toEqual(['Khor']);
      expect(result.settlementRoots).toEqual(['Khor']);
      expect(result.geographicNames).toContain('Mount Khor');
      expect(result.geographicNames).toContain('Khor Peaks');
      expect(result.geographicNames).toContain('Khor River');
      expect(result.factionRoots).toContain('House Khor');
      expect(result.factionRoots).toContain('The Khor Guard');
      expect(result.artifactRoots).toContain('The Khor Blade');
      expect(result.artifactRoots).toContain('Crown of Khor');
    });

    describe('Typed custom vocabulary regressions', () => {
      const culture = cultures.danubian_slavic;
      const vocabulary = {
        customSeeds: {
          given_names_masculine: ['Alder'],
          given_names_feminine: ['Elora'],
          surnames: ["O'Vale"],
          settlement_roots: ['Haven'],
          orogeny_stems: ['Crag'],
          hydrology_stems: ['Brook'],
          wilds_stems: ['Grove'],
        },
      };
      const grammar = new RecursiveGrammarEngine({ randomFn: () => 0 });
      it('retains gender, surname, settlement and geographic pools without cross-contamination', () => {
        const context = prepareCustomGenerationContext(culture, vocabulary, 'character');
        const base = { culture: context.augmentedCulture, customVariables: context.customVariables, temperature: 0 };
        expect(grammar.resolve('{given} {surname}', { ...base, gender: 'masculine' })).toBe("Alderik O'Vale");
        expect(grammar.resolve('{given} {surname}', { ...base, gender: 'feminine' })).toBe("Eloraik O'Vale");
        expect(context.customVariables.given_names_masculine).toContain('Alder');
        expect(context.customVariables.given_names_feminine).toContain('Elora');
        expect(context.augmentedCulture.seeds.given_names_feminine).not.toContain('Alderik');
        expect(context.augmentedCulture.seeds.surnames).not.toContain('Brookov');
        expect(context.augmentedCulture.geographic_lexicon.orogeny.stems).not.toContain('Brook');
        expect(grammar.resolve('{root}{suffix}', { ...base, customVariables: { ...base.customVariables, suffix: 'ford' } })).toBe('Havenford');
        for (const [featureSubtype, expected] of [['orogeny', 'Crag'], ['hydrology', 'Brook'], ['wilds', 'Grove']] as const) {
          expect(grammar.resolve('{stem}', { ...base, featureSubtype })).toBe(expected);
          expect(grammar.resolve(`{${featureSubtype}.stems}`, base)).toBe(expected);
        }
        expect(context.weightedSeeds.every((seed) => /^(Alder|Elora|O'Vale)/.test(seed))).toBe(true);
        expect(prepareCustomGenerationContext(culture, vocabulary, 'geography', { featureSubtype: 'hydrology' }).weightedSeeds).toEqual(['Brook']);
        expect(prepareCustomGenerationContext(culture, vocabulary, 'character', { gender: 'feminine' }).weightedSeeds)
          .not.toContain('Alderik');
      });

      it('does not redirect a missing typed custom pool to a different gender or feature', () => {
        const context = prepareCustomGenerationContext(culture, {
          customSeeds: { given_names_masculine: ['Alder'], orogeny_stems: ['Crag'] },
        }, 'character');
        const base = { culture: context.augmentedCulture, customVariables: context.customVariables };
        expect(grammar.resolve('{given}', {
          ...base, gender: 'feminine', temperature: 1,
          markov: new MarkovNameGenerator(['Alder']),
        })).toBe(culture.seeds.given_names_feminine[0]);
        expect(grammar.resolve('{stem}', { ...base, featureSubtype: 'hydrology' })).toBe(culture.geographic_lexicon.hydrology.stems[0]);
      });

      it.each(['character', 'geography', 'settlement'] as const)('resolves every affix-only %s template without missing root_stem', (category) => {
        const context = prepareCustomGenerationContext(culture, {
          customPrefixes: ['Fort-'], customSuffixes: ['-haven'],
        }, category);
        for (const template of context.templates) {
          const name = grammar.resolve(template, {
            culture: context.augmentedCulture, customVariables: context.customVariables, featureSubtype: 'hydrology',
          });
          expect(name, template).not.toMatch(/[{}]|undefined/);
          expect(name.trim().length).toBeGreaterThan(0);
        }
      });

      it('uses bare feature stems in compounds rather than compounding already complete names', () => {
        const context = prepareCustomGenerationContext(culture, {
          ...vocabulary, customPrefixes: ['Fort-'], customSuffixes: ['-haven'],
        }, 'geography');
        expect(grammar.resolve('{prefix}{root_stem}{suffix}', {
          culture: context.augmentedCulture, customVariables: context.customVariables, featureSubtype: 'hydrology',
        })).toBe('Fort-Brookhaven');
      });

      it('honors seed-level affixes/titles and plural categories', () => {
        const context = prepareCustomGenerationContext(culture, {
          customSeeds: { prefixes: ['New'], suffixes: ['-ford'], honorific_titles: ['Warden'] },
        }, 'settlements');
        expect(context.customVariables.prefix).toEqual(['New ']);
        expect(context.customVariables.suffix).toEqual(['ford']);
        expect(context.customVariables.title).toEqual(['Warden']);
        expect(context.templates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('prepareCustomGenerationContext', () => {
    it('augments culture and grammar templates with custom affixes and roots', () => {
      const primaryCulture = cultures['danubian_slavic'];
      const customVocab = {
        honorifics: ['Grand Inquisitor'],
        customPrefixes: ['Fort-'],
        customSuffixes: ['-haven'],
        customSeeds: {
          settlement_roots: ['Valer'],
          epithets: ['the Undaunted'],
        },
      };

      const context = prepareCustomGenerationContext(primaryCulture, customVocab, 'settlement');

      // Check custom variables
      expect(context.customVariables['prefix']).toContain('Fort-');
      expect(context.customVariables['suffix']).toContain('haven');
      expect(context.customVariables['title']).toContain('Grand Inquisitor');
      expect(context.customVariables['epithet']).toContain('the Undaunted');

      // Check root variations in customVariables
      const roots = context.customVariables['root'] as string[];
      expect(roots.length).toBeGreaterThan(0);
      expect(roots.some((r) => r.toLowerCase().includes('valer'))).toBe(true);

      // Check settlement templates prioritize affixes
      expect(context.templates.some((t) => t.includes('{prefix}'))).toBe(true);
      expect(context.templates.some((t) => t.includes('{suffix}'))).toBe(true);
    });
  });
});
