/**
 * Hierarchical Lineage Branching Engine
 *
 * Expands parent lore entities into subordinate descendants and subdivisions
 * across 5 core lineage categories:
 * 1. Settlements -> Urban Subdivisions (Wards, Quarters, Gates, Catacombs, Guildhalls)
 * 2. People -> Household, Kin & Retinue (Guard, Lieutenants, Squires, Heirs, Spouse, Patronymics)
 * 3. Comprehensive Geographic Hierarchy (4 Tiers: Macro Region -> Mountains/Basins -> Rivers/Fords -> Wilds/Caves)
 * 4. Factions -> Hierarchical Ranks & Chapters (Grandmasters, Chapterhouses, Initiates, Envoys, Relics)
 * 5. Artifacts & Relics -> Provenance & Bearers (Bound Bearers, Shrines, Vaults)
 */

import { RecursiveGrammarEngine } from './grammar';
import { MarkovNameGenerator, type MarkovSampleOptions } from './markov';
import { AnglicizationEngine } from './anglicize';
import { getCultureById, cultures } from '../data/cultures';
import {
  LoreEntity,
  EntityCategory,
  GeographicFeatureType,
  CultureProfile,
  normalizeEntityCategory,
} from '../types/domain';

class TemperatureMarkovGenerator extends MarkovNameGenerator {
  private readonly defaultTemp: number;

  constructor(seeds: string[], order: number, temperature: number) {
    super(seeds, { order });
    this.defaultTemp = temperature;
  }

  override generate(options?: MarkovSampleOptions): string {
    return super.generate({
      temperature: this.defaultTemp,
      ...options,
    });
  }
}

export interface BranchingEngineOptions {
  grammarEngine?: RecursiveGrammarEngine;
  anglicizationEngine?: AnglicizationEngine;
  markovOrder?: number;
  temperature?: number;
  randomFn?: () => number;
}

export interface BranchOptions {
  count?: number;
  markovOrder?: number;
  temperature?: number;
  anglicize?: boolean;
  anglicizeMode?: 'phonetic' | 'suffix' | 'full';
  culture?: CultureProfile;
  randomFn?: () => number;
  customVariables?: Record<string, string | number | string[]>;
}

interface SubtypeRule {
  normalizedSubtype: string;
  category: EntityCategory;
  featureSubtype?: GeographicFeatureType;
  tier?: number;
  aliases: string[];
  templates: string[];
  cultureTemplates?: Record<string, string[]>;
}

// ============================================================================
// Branching Subtype Definition Rules
// ============================================================================

const SUBTYPE_RULES: SubtypeRule[] = [
  // 1. Settlements -> Urban Subdivisions
  {
    normalizedSubtype: 'City Ward',
    category: 'settlement',
    aliases: ['city ward', 'city wards', 'ward', 'wards'],
    templates: [
      '{Parent.root} Ward',
      'Lower {Parent.root}',
      'Upper {Parent.root}',
      '{Parent.root} Old Ward',
      '{Parent.root} Market Ward',
      '{Parent.root} Crown Ward',
      'High {Parent.root} Ward',
      '{Parent.root} Artisan Quarter',
    ],
  },
  {
    normalizedSubtype: 'Harbor Quarter',
    category: 'settlement',
    aliases: ['harbor quarter', 'harbor quarters', 'harbor', 'docks', 'wharves', 'haven quarter'],
    templates: [
      '{Parent.root} Docks',
      '{Parent.root} Harbor Quarter',
      'Port of {Parent.root}',
      '{Parent.root} Wharves',
      '{Parent.root} Anchorage',
      'Lower {Parent.root} Docks',
    ],
  },
  {
    normalizedSubtype: 'High Gate',
    category: 'settlement',
    aliases: ['high gate', 'high gates', 'gate', 'gates', 'city gate'],
    templates: [
      'Gate of {Parent.root}',
      'High Gate of {Parent.root}',
      '{Parent.root} Sun Gate',
      '{Parent.root} Iron Gate',
      'North Gate of {Parent.root}',
      '{Parent.root} Watch Gate',
    ],
  },
  {
    normalizedSubtype: 'Catacombs',
    category: 'settlement',
    aliases: ['catacombs', 'catacomb', 'crypts', 'vaults', 'undercity', 'under-city'],
    templates: [
      'Catacombs of {Parent.root}',
      '{Parent.root} Vaults',
      'Crypts of {Parent.root}',
      '{Parent.root} Under-city',
      'Necropolis of {Parent.root}',
      'Deep Crypts of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Local Guildhall',
    category: 'settlement',
    aliases: ['local guildhall', 'local guildhalls', 'guildhall', 'guildhalls', 'guild hall'],
    templates: [
      '{Parent.root} Artisans Guildhall',
      '{Parent.root} Merchant Hall',
      'Grand Guildhall of {Parent.root}',
      '{Parent.root} Smiths Hall',
      'Masons Hall of {Parent.root}',
    ],
  },

  // 2. People -> Household, Kin & Retinue
  {
    normalizedSubtype: 'Household Guard',
    category: 'character',
    aliases: ['household guard', 'household guards', 'guard', 'guards', 'retinue guard', 'sentinel'],
    templates: [
      '{Markov:Person}, Guard of {Parent.name}',
      '{Markov:Person}, Sentinel of {Parent.root}',
      '{Markov:Person}, Shieldbearer of {Parent.name}',
      '{Markov:Person}, Sworn Guard of {Parent.root}',
      'Shield of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Lieutenant',
    category: 'character',
    aliases: ['lieutenant', 'lieutenants', 'captain', 'second in command', 'deputy'],
    templates: [
      '{Markov:Person}, Lieutenant of {Parent.name}',
      '{Markov:Person}, Captain under {Parent.name}',
      '{Markov:Person}, Second of {Parent.root}',
      'Captain {Markov:Person} of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Squire',
    category: 'character',
    aliases: ['squire', 'squires', 'page', 'apprentice'],
    templates: [
      '{Markov:Person}, Squire to {Parent.name}',
      '{Markov:Person}, Page of {Parent.root}',
      'Squire {Markov:Person} of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Heir',
    category: 'character',
    aliases: ['heir', 'heirs', 'successor'],
    templates: [
      '{Markov:Person} {Parent.root}',
      '{Markov:Person} of House {Parent.root}',
      '{Markov:Person}, Heir of {Parent.name}',
    ],
    cultureTemplates: {
      celtic_gaelic: ['{Markov:Person} mac {Parent.root}', '{Markov:Person} nic {Parent.root}'],
      nordic_scandian: ['{Markov:Person} {Parent.root}sson', '{Markov:Person} {Parent.root}sdottir'],
      danubian_slavic: ['{Markov:Person} {Parent.root}ov', '{Markov:Person} {Parent.root}escu'],
      levantine_semitic: ['{Markov:Person} ibn {Parent.root}', '{Markov:Person} bint {Parent.root}'],
      greco_aegean: ['{Markov:Person} {Parent.root}ides'],
    },
  },
  {
    normalizedSubtype: 'Spouse',
    category: 'character',
    aliases: ['spouse', 'spouses', 'consort', 'wife', 'husband', 'partner'],
    templates: [
      '{Markov:Person} of House {Parent.root}',
      '{Markov:Person}, Consort of {Parent.name}',
      '{Markov:Person} of {Parent.root}',
      'Lady {Markov:Person} of {Parent.root}',
      'Consort {Markov:Person} of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Patronymic Lineage',
    category: 'character',
    aliases: ['patronymic lineage', 'patronymic', 'lineage', 'kin', 'heir and kin', 'descendant', 'bloodline'],
    templates: [
      '{Markov:Person} {Parent.root}',
      '{Markov:Person} of the Line of {Parent.root}',
      '{Markov:Person} of House {Parent.root}',
    ],
    cultureTemplates: {
      celtic_gaelic: ['{Markov:Person} mac {Parent.root}', '{Markov:Person} ap {Parent.root}'],
      nordic_scandian: ['{Markov:Person} {Parent.root}sson', '{Markov:Person} {Parent.root}dottir'],
      danubian_slavic: ['{Markov:Person} {Parent.root}ovich', '{Markov:Person} {Parent.root}escu'],
      levantine_semitic: ['{Markov:Person} ibn {Parent.root}', '{Markov:Person} bint {Parent.root}'],
      greco_aegean: ['{Markov:Person} {Parent.root}ides'],
    },
  },

  // 3. Comprehensive Geographic Hierarchy (4 Tiers)
  // Tier 1 -> Tier 2
  {
    normalizedSubtype: 'Mountain Range',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['mountain range', 'mountain ranges', 'interior mountain chains', 'interior mountain chain', 'mountains', 'mountain chain'],
    templates: [
      '{Parent.root} Mountains',
      '{Parent.root} Range',
      '{Markov:Orogeny} Range of {Parent.root}',
      '{Parent.root} Highlands',
      '{Parent.root} Ridge',
      'The {Parent.root} Heights',
    ],
  },
  {
    normalizedSubtype: 'Interior Basin',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['interior basin', 'interior basins', 'basin', 'basins', 'interior mountain basin'],
    templates: [
      '{Parent.root} Basin',
      '{Parent.root} Lowlands',
      'Great Basin of {Parent.root}',
      '{Parent.root} Depression',
      'Sunken Vale of {Parent.root}',
    ],
  },
  // Tier 1 -> Tier 3
  {
    normalizedSubtype: 'Primary River Basin',
    category: 'geography',
    featureSubtype: 'hydrology',
    tier: 3,
    aliases: ['primary river basin', 'primary river basins', 'river basin', 'river basins', 'river system'],
    templates: [
      '{Parent.root} River',
      'River {Parent.root}',
      '{Parent.root} Basin',
      '{Markov:Hydrology} Basin of {Parent.root}',
      'The Great {Parent.root} Waterway',
    ],
  },
  // Tier 1 -> Tier 4
  {
    normalizedSubtype: 'Border Wetlands',
    category: 'geography',
    featureSubtype: 'wilds',
    tier: 4,
    aliases: ['border wetlands', 'border wetland', 'wetlands', 'wetland', 'marshes', 'marsh', 'fens', 'bogs'],
    templates: [
      '{Parent.root} Marshes',
      '{Parent.root} Fens',
      'Border Bogs of {Parent.root}',
      '{Parent.root} Swamplands',
      'Outer Reeds of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Primeval Woods',
    category: 'geography',
    featureSubtype: 'wilds',
    tier: 4,
    aliases: ['primeval woods', 'primeval wood', 'primeval forest', 'woods', 'forest', 'weald', 'ancient forest'],
    templates: [
      '{Parent.root} Primeval Forest',
      '{Parent.root} Weald',
      'Great Woods of {Parent.root}',
      '{Markov:Wilds} Forest of {Parent.root}',
      'Deep Forest of {Parent.root}',
    ],
  },

  // Tier 2 (Orogeny) -> Subordinates
  {
    normalizedSubtype: 'Mountain Pass',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['mountain pass', 'mountain passes', 'subordinate passes', 'subordinate pass', 'pass', 'passes', 'defile'],
    templates: [
      '{Parent.root} Pass',
      'High Pass of {Parent.root}',
      '{Parent.root} Defile',
      '{Parent.root} Notch',
      'Gate of {Parent.root}',
      '{Parent.root} Gap',
    ],
  },
  {
    normalizedSubtype: 'Individual Peak',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['individual peak', 'individual peaks', 'peak', 'peaks', 'mount', 'pinnacle', 'horn'],
    templates: [
      '{Parent.root} Peak',
      'Mount {Parent.root}',
      '{Parent.root} Horn',
      '{Parent.root} Crag',
      '{Parent.root} Needle',
      'Pinnacle of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Canyon',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['canyon', 'canyons', 'chasm'],
    templates: [
      '{Parent.root} Canyon',
      'Great Canyon of {Parent.root}',
      '{Parent.root} Chasm',
      'Red Canyon of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Gorge',
    category: 'geography',
    featureSubtype: 'orogeny',
    tier: 2,
    aliases: ['gorge', 'gorges', 'ravine'],
    templates: [
      '{Parent.root} Gorge',
      'Narrow Gorge of {Parent.root}',
      '{Parent.root} Ravine',
      'Black Gorge of {Parent.root}',
    ],
  },

  // Tier 3 (Hydrology) -> Subordinates
  {
    normalizedSubtype: 'River Ford',
    category: 'geography',
    featureSubtype: 'hydrology',
    tier: 3,
    aliases: ['river ford', 'river fords', 'ford', 'fords', 'crossing', 'river crossing'],
    templates: [
      '{Parent.root} Ford',
      'Crossing of {Parent.root}',
      'Upper {Parent.root} Ford',
      'Shallow Ford of {Parent.root}',
      '{Parent.root} Stone Crossing',
    ],
  },
  {
    normalizedSubtype: 'Tributary',
    category: 'geography',
    featureSubtype: 'hydrology',
    tier: 3,
    aliases: ['tributary', 'tributaries', 'stream', 'brook', 'run', 'creek'],
    templates: [
      '{Parent.root} Tributary',
      'Little {Parent.root}',
      '{Parent.root} Run',
      '{Parent.root} Stream',
      '{Parent.root} Brook',
    ],
  },
  {
    normalizedSubtype: 'Delta Basin',
    category: 'geography',
    featureSubtype: 'hydrology',
    tier: 3,
    aliases: ['delta basin', 'delta basins', 'delta', 'deltas', 'estuary', 'river mouth'],
    templates: [
      '{Parent.root} Delta',
      '{Parent.root} Estuary',
      'Mouths of {Parent.root}',
      '{Parent.root} Delta Basin',
      'Lower Reach of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Riverfront Settlement',
    category: 'settlement',
    aliases: ['riverfront settlement', 'riverfront settlements', 'river settlement', 'river port', 'haven'],
    templates: [
      '{Parent.root}-upon-River',
      '{Parent.root} Haven',
      '{Parent.root} Port',
      'Bridge of {Parent.root}',
      '{Parent.root} Reach',
    ],
  },

  // Tier 4 (Wilds) -> Subordinates
  {
    normalizedSubtype: 'Grove',
    category: 'geography',
    featureSubtype: 'wilds',
    tier: 4,
    aliases: ['grove', 'groves', 'sacred grove'],
    templates: [
      '{Parent.root} Grove',
      'Sacred Grove of {Parent.root}',
      'Hidden Grove of {Parent.root}',
      '{Parent.root} Whispering Grove',
    ],
  },
  {
    normalizedSubtype: 'Ancient Cave',
    category: 'geography',
    featureSubtype: 'wilds',
    tier: 4,
    aliases: ['ancient cave', 'ancient caves', 'cave', 'caves', 'caverns', 'cavern', 'grotto'],
    templates: [
      'Caverns of {Parent.root}',
      '{Parent.root} Deep Cave',
      'Ancient Caves of {Parent.root}',
      '{Parent.root} Grotto',
      'Hollow Caverns of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Waystation',
    category: 'settlement',
    aliases: ['waystation', 'waystations', 'waypost', 'post', 'crossroad post', 'refuge'],
    templates: [
      '{Parent.root} Waystation',
      '{Parent.root} Crossroad Post',
      '{Parent.root} Refuge',
      'Waypost of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Hollow',
    category: 'geography',
    featureSubtype: 'wilds',
    tier: 4,
    aliases: ['hollow', 'hollows', 'dell', 'glade'],
    templates: [
      '{Parent.root} Hollow',
      '{Parent.root} Dell',
      'Mist Hollow of {Parent.root}',
      'Quiet Dell of {Parent.root}',
    ],
  },

  // 4. Factions -> Hierarchical Ranks & Chapters
  {
    normalizedSubtype: 'Grandmaster',
    category: 'character',
    aliases: ['grandmaster', 'grandmasters', 'grand master', 'commander', 'lord commander', 'high prelate'],
    templates: [
      '{Markov:Person}, Grandmaster of {Parent.name}',
      'Lord Commander {Markov:Person} of {Parent.root}',
      '{Markov:Person}, High Master of {Parent.name}',
      'Archon {Markov:Person} of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Chapterhouse',
    category: 'settlement',
    aliases: ['chapterhouse', 'chapterhouses', 'chapter house', 'commandery', 'bastion'],
    templates: [
      '{Parent.root} Chapterhouse',
      '{Parent.root} Commandery',
      'Hall of {Parent.root}',
      '{Parent.root} Bastion',
      'High Chapter of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Initiate Rank',
    category: 'character',
    aliases: ['initiate rank', 'initiate ranks', 'initiate', 'initiates', 'novice', 'acolyte'],
    templates: [
      '{Markov:Person}, Initiate of {Parent.name}',
      'Novice {Markov:Person} of {Parent.root}',
      '{Markov:Person}, Acolyte of {Parent.root}',
      'Initiate {Markov:Person} of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Envoy',
    category: 'character',
    aliases: ['envoy', 'envoys', 'legate', 'herald', 'ambassador'],
    templates: [
      '{Markov:Person}, Envoy of {Parent.name}',
      '{Markov:Person}, Legate of {Parent.root}',
      'Herald {Markov:Person} of {Parent.name}',
      '{Markov:Person}, Diplomat of {Parent.root}',
    ],
  },
  {
    normalizedSubtype: 'Faction Relic',
    category: 'character',
    aliases: ['faction relic', 'faction relics', 'standard', 'banner', 'seal', 'sacred relic'],
    templates: [
      'Standard of {Parent.name}',
      'Banner of {Parent.root}',
      'Seal of {Parent.name}',
      'Sacred Relic of {Parent.root}',
      '{Parent.root} Aegis',
    ],
  },

  // 5. Artifacts & Relics -> Provenance & Bearers
  {
    normalizedSubtype: 'Bound Bearer',
    category: 'character',
    aliases: ['bound bearer', 'bound bearers', 'bearer', 'bearers', 'keeper', 'champion'],
    templates: [
      '{Markov:Person}, Bearer of {Parent.name}',
      '{Markov:Person} the Bearer',
      'Keeper {Markov:Person} of {Parent.root}',
      '{Markov:Person}, Champion of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Shrine of Consecration',
    category: 'settlement',
    aliases: ['shrine of consecration', 'shrine', 'shrines', 'sanctuary', 'altar', 'shrine / vault of consecration'],
    templates: [
      'Shrine of {Parent.name}',
      'Sanctuary of {Parent.root}',
      '{Parent.root} Consecrated Shrine',
      'Altar of {Parent.name}',
    ],
  },
  {
    normalizedSubtype: 'Vault of Consecration',
    category: 'settlement',
    aliases: ['vault of consecration', 'vault', 'vaults', 'crypt', 'depository'],
    templates: [
      'Vault of {Parent.name}',
      '{Parent.root} Vault of Consecration',
      'Crypt of {Parent.name}',
      'Depository of {Parent.root}',
    ],
  },
];

// Lookup map for fast alias-to-rule resolution
const RULE_MAP = new Map<string, SubtypeRule>();
for (const rule of SUBTYPE_RULES) {
  RULE_MAP.set(rule.normalizedSubtype.toLowerCase(), rule);
  for (const alias of rule.aliases) {
    RULE_MAP.set(alias.toLowerCase(), rule);
  }
}

// ============================================================================
// Lineage Branching Engine Implementation
// ============================================================================

export class LineageBranchingEngine {
  private static defaultInstance = new LineageBranchingEngine();

  static getAvailableBranchSubtypes(parent: LoreEntity): string[] {
    return LineageBranchingEngine.defaultInstance.getAvailableBranchSubtypes(parent);
  }

  private readonly grammarEngine: RecursiveGrammarEngine;
  private readonly anglicizationEngine: AnglicizationEngine;
  private readonly defaultMarkovOrder: number;
  private readonly defaultTemperature: number;
  private readonly randomFn?: () => number;
  private readonly markovCache: Map<string, MarkovNameGenerator> = new Map();
  private counter = 0;

  constructor(options?: BranchingEngineOptions) {
    this.grammarEngine = options?.grammarEngine ?? new RecursiveGrammarEngine({ randomFn: options?.randomFn });
    this.anglicizationEngine = options?.anglicizationEngine ?? new AnglicizationEngine();
    this.defaultMarkovOrder = options?.markovOrder ?? 2;
    this.defaultTemperature = options?.temperature ?? 1.0;
    this.randomFn = options?.randomFn;
  }

  private getRandom(options?: BranchOptions): number {
    if (options?.randomFn) return options.randomFn();
    if (this.randomFn) return this.randomFn();
    return Math.random();
  }

  /**
   * Identifies the high-level parent branching domain to determine
   * available subtypes and lineage rules.
   */
  private identifyParentDomain(
    parent: LoreEntity
  ): 'settlement' | 'character' | 'faction' | 'artifact' | 'geography_tier1' | 'geography_tier2' | 'geography_tier3' | 'geography_tier4' {
    if (!parent || typeof parent !== 'object') {
      throw new Error('LineageBranchingEngine: parent entity must be a valid object');
    }

    const rawSubtype = (parent.subtype ?? (parent.metadata?.subtype as string) ?? '').toLowerCase();
    const tier = (parent.metadata?.tier as number) ?? undefined;

    // Faction checks
    if (/(faction|legion|order|guild|cult|cabal|brotherhood|enclave|covenant)/.test(rawSubtype)) {
      return 'faction';
    }

    // Artifact / Relic checks
    if (/(artifact|relic|weapon|grimoire|tome|sword|blade|bow|shield|heirloom|regalia)/.test(rawSubtype)) {
      return 'artifact';
    }

    // Geographic tiers
    if (tier === 1 || /(macro region|continent|realm|province|territory)/.test(rawSubtype)) {
      return 'geography_tier1';
    }
    if (tier === 2 || parent.featureSubtype === 'orogeny' || /(mountain|orogeny|range|peaks|ridge|highlands|basin|chain)/.test(rawSubtype)) {
      return 'geography_tier2';
    }
    if (tier === 3 || parent.featureSubtype === 'hydrology' || /(river|hydrology|waterway|stream|delta|lake)/.test(rawSubtype)) {
      return 'geography_tier3';
    }
    if (tier === 4 || parent.featureSubtype === 'wilds' || /(wild|forest|wood|marsh|fen|wetland|grove|cave|steppe|biome)/.test(rawSubtype)) {
      return 'geography_tier4';
    }

    const normCat = normalizeEntityCategory(parent.category);

    // Settlement checks
    if (normCat === 'settlement' || /(settlement|metropolis|city|fortress|town|village|haven|stronghold|keep|outpost|bastion)/.test(rawSubtype)) {
      return 'settlement';
    }

    // Character checks
    if (normCat === 'character' || /(noble|officer|king|queen|prince|lord|lady|warrior|knight|voivode|knyaz|general|commander)/.test(rawSubtype)) {
      return 'character';
    }

    // Geography fallback
    if (normCat === 'geography') {
      if (parent.featureSubtype === 'orogeny') return 'geography_tier2';
      if (parent.featureSubtype === 'hydrology') return 'geography_tier3';
      if (parent.featureSubtype === 'wilds') return 'geography_tier4';
      return 'geography_tier1';
    }

    if (normCat === 'faction') return 'faction';
    if (normCat === 'artifact') return 'artifact';
    return 'settlement';
  }

  /**
   * Retrieves list of available subordinate branch subtypes for a given parent entity.
   */
  getAvailableBranchSubtypes(parent: LoreEntity): string[] {
    const domain = this.identifyParentDomain(parent);

    switch (domain) {
      case 'settlement':
        return ['City Ward', 'Harbor Quarter', 'High Gate', 'Catacombs', 'Local Guildhall'];
      case 'character':
        return ['Household Guard', 'Lieutenant', 'Squire', 'Heir', 'Spouse', 'Patronymic Lineage'];
      case 'faction':
        return ['Grandmaster', 'Chapterhouse', 'Initiate Rank', 'Envoy', 'Faction Relic'];
      case 'artifact':
        return ['Bound Bearer', 'Shrine of Consecration', 'Vault of Consecration'];
      case 'geography_tier1':
        return [
          'Mountain Range',
          'Interior Basin',
          'Primary River Basin',
          'Border Wetlands',
          'Primeval Woods',
        ];
      case 'geography_tier2':
        return ['Mountain Pass', 'Individual Peak', 'Canyon', 'Gorge'];
      case 'geography_tier3':
        return ['River Ford', 'Tributary', 'Delta Basin', 'Riverfront Settlement'];
      case 'geography_tier4':
        return ['Grove', 'Ancient Cave', 'Waystation', 'Hollow'];
    }
  }

  /**
   * Resolve or construct a SubtypeRule for the requested child subtype.
   */
  private resolveRule(childSubtype: string, parent: LoreEntity): SubtypeRule {
    const cleanSubtype = childSubtype.trim().toLowerCase();
    const existing = RULE_MAP.get(cleanSubtype);
    if (existing) {
      return existing;
    }

    // Fallback rule for custom requested subtype
    const domain = this.identifyParentDomain(parent);
    let fallbackCategory: EntityCategory = parent.category;
    let fallbackFeatureSubtype: GeographicFeatureType | undefined = parent.featureSubtype;
    let fallbackTier: number | undefined = parent.metadata?.tier as number | undefined;

    if (domain === 'settlement') {
      fallbackCategory = 'settlement';
    } else if (domain === 'character' || domain === 'faction') {
      fallbackCategory = 'character';
    } else if (domain.startsWith('geography')) {
      fallbackCategory = 'geography';
      if (domain === 'geography_tier2') {
        fallbackFeatureSubtype = 'orogeny';
        fallbackTier = 2;
      } else if (domain === 'geography_tier3') {
        fallbackFeatureSubtype = 'hydrology';
        fallbackTier = 3;
      } else if (domain === 'geography_tier4') {
        fallbackFeatureSubtype = 'wilds';
        fallbackTier = 4;
      } else {
        fallbackTier = 1;
      }
    }

    const titleCased = childSubtype
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return {
      normalizedSubtype: titleCased,
      category: fallbackCategory,
      featureSubtype: fallbackFeatureSubtype,
      tier: fallbackTier,
      aliases: [cleanSubtype],
      templates: [
        `{Parent.root} ${titleCased}`,
        `${titleCased} of {Parent.root}`,
        `${titleCased} of {Parent.name}`,
      ],
    };
  }

  /**
   * Branches child entities from a parent LoreEntity according to cultural and domain lineage rules.
   *
   * @param parent The parent LoreEntity to branch from
   * @param childSubtype The requested child subtype, or 'auto' to choose an available branch subtype
   * @param count Number of child entities to generate (default: 1)
   * @param options Branching configuration options
   */
  branchChildren(
    parent: LoreEntity,
    childSubtype?: string,
    count?: number,
    options?: BranchOptions
  ): LoreEntity[] {
    if (!parent || !parent.id || !parent.name) {
      throw new Error('LineageBranchingEngine: parent entity must have valid id and name');
    }

    const effectiveCount = Math.max(1, count ?? options?.count ?? 1);

    // If subtype is empty or 'auto', choose one from available branch subtypes
    let targetSubtype = childSubtype?.trim();
    if (!targetSubtype || targetSubtype.toLowerCase() === 'auto') {
      const available = this.getAvailableBranchSubtypes(parent);
      const randIdx = Math.floor(this.getRandom(options) * available.length);
      targetSubtype = available[Math.min(randIdx, available.length - 1)];
    }

    const rule = this.resolveRule(targetSubtype, parent);
    const cultureId = options?.culture?.id ?? parent.cultureId;
    const culture = options?.culture ?? getCultureById(cultureId) ?? cultures[cultureId];

    // Build parent context with robust fallbacks for grammar engine
    const parentRoot = parent.rootName ?? parent.originalRoot ?? parent.name;
    const parentOriginalRoot = parent.originalRoot ?? parent.rootName ?? parent.originalName ?? parent.name;
    const parentName = parent.name;
    const parentOriginalName = parent.originalName ?? parent.name;

    const parentContext = {
      ...parent,
      root: parentRoot,
      originalRoot: parentOriginalRoot,
      name: parentName,
      originalName: parentOriginalName,
    };

    // Determine available templates (prioritizing culture-specific templates if any)
    let templates = rule.templates;
    if (rule.cultureTemplates && cultureId && rule.cultureTemplates[cultureId]) {
      templates = rule.cultureTemplates[cultureId];
    }

    // Build context-specific Markov generators only if templates require Markov tokens
    const markovGenerators: Record<string, MarkovNameGenerator> = {};
    const needsMarkov = templates.some((t) => t.includes('{Markov:'));

    if (needsMarkov && culture) {
      const order = options?.markovOrder ?? this.defaultMarkovOrder;
      const temperature = options?.temperature ?? this.defaultTemperature;

      const getOrTrain = (key: string, seeds: string[]): MarkovNameGenerator => {
        const cacheKey = `${cultureId}:${key}:${order}:${temperature}`;
        let gen = this.markovCache.get(cacheKey);
        if (!gen) {
          gen = new TemperatureMarkovGenerator(seeds, order, temperature);
          this.markovCache.set(cacheKey, gen);
        }
        return gen;
      };

      if (culture.seeds) {
        const mascSeeds = culture.seeds.given_names_masculine || [];
        const femSeeds = culture.seeds.given_names_feminine || [];
        const allPersonSeeds = [...mascSeeds, ...femSeeds];

        if (mascSeeds.length > 0) {
          const mascGen = getOrTrain('masculine', mascSeeds);
          markovGenerators['masculine'] = mascGen;
        }
        if (femSeeds.length > 0) {
          const femGen = getOrTrain('feminine', femSeeds);
          markovGenerators['feminine'] = femGen;
        }
        if (allPersonSeeds.length > 0) {
          const personGen = getOrTrain('person', allPersonSeeds);
          markovGenerators['person'] = personGen;
          markovGenerators['given'] = personGen;
        }

        if (culture.seeds.settlement_roots && culture.seeds.settlement_roots.length > 0) {
          markovGenerators['settlement'] = getOrTrain('settlement', culture.seeds.settlement_roots);
        }
      }

      if (culture.geographic_lexicon) {
        if (culture.geographic_lexicon.orogeny?.stems?.length) {
          markovGenerators['orogeny'] = getOrTrain('orogeny', culture.geographic_lexicon.orogeny.stems);
        }
        if (culture.geographic_lexicon.hydrology?.stems?.length) {
          markovGenerators['hydrology'] = getOrTrain('hydrology', culture.geographic_lexicon.hydrology.stems);
        }
        if (culture.geographic_lexicon.wilds?.stems?.length) {
          markovGenerators['wilds'] = getOrTrain('wilds', culture.geographic_lexicon.wilds.stems);
        }
      }
    }

    const generatedChildren: LoreEntity[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < effectiveCount; i++) {
      this.counter++;
      const idSlug = rule.normalizedSubtype.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const childId = `${parent.id}-${idSlug}-${i + 1}-${this.counter}`;

      // Pick a template, cycling or randomizing without immediate duplicates
      let template: string;
      if (i < templates.length) {
        template = templates[i];
      } else {
        const randIdx = Math.floor(this.getRandom(options) * templates.length);
        template = templates[Math.min(randIdx, templates.length - 1)];
      }

      let resolvedName = this.grammarEngine.resolve(template, {
        culture,
        parent: parentContext,
        markovGenerators,
        customVariables: options?.customVariables,
        randomFn: options?.randomFn ?? this.randomFn,
      });

      // Avoid collision if duplicate name resolved
      if (usedNames.has(resolvedName)) {
        if (templates.length > 1) {
          for (const altTemplate of templates) {
            const altResolved = this.grammarEngine.resolve(altTemplate, {
              culture,
              parent: parentContext,
              markovGenerators,
              customVariables: options?.customVariables,
              randomFn: options?.randomFn ?? this.randomFn,
            });
            if (!usedNames.has(altResolved)) {
              resolvedName = altResolved;
              break;
            }
          }
        }
      }
      usedNames.add(resolvedName);

      // Child inherits root or maintains parent root lineage
      const childRoot = parentRoot;
      const childOriginalRoot = parentOriginalRoot;

      let child: LoreEntity = {
        id: childId,
        parentId: parent.id,
        name: resolvedName,
        originalName: resolvedName,
        rootName: childRoot,
        originalRoot: childOriginalRoot,
        category: rule.category,
        cultureId,
        subtype: rule.normalizedSubtype,
        featureSubtype: rule.featureSubtype,
        children: [],
        metadata: {
          subtype: rule.normalizedSubtype,
          ...(rule.tier ? { tier: rule.tier } : {}),
        },
        createdAt: Date.now(),
      };

      // Handle Anglicization
      const shouldAnglicize =
        options?.anglicize ?? (parent.anglicization?.enabled === true);

      if (shouldAnglicize) {
        child = this.anglicizationEngine.anglicizeEntity(child, {
          mode: options?.anglicizeMode ?? parent.anglicization?.mode ?? 'full',
          cultureId,
          root: childRoot,
        });
      }

      generatedChildren.push(child);
    }

    // Attach to parent's children array if initialized
    if (parent.children && Array.isArray(parent.children)) {
      parent.children.push(...generatedChildren);
    }

    return generatedChildren;
  }
}
