/**
 * Core Domain Types for Historical & Speculative Name/Lore Generator
 */

export type EntityCategory =
  | 'character'
  | 'settlement'
  | 'geography'
  | 'faction'
  | 'artifact'
  | 'people'
  | 'settlements'
  | 'factions'
  | 'artifacts';

/**
 * Normalizes any singular or plural entity category to standard singular form
 */
export function normalizeEntityCategory(
  category: string
): 'character' | 'settlement' | 'geography' | 'faction' | 'artifact' {
  const lower = category.toLowerCase().trim();
  if (lower === 'people' || lower === 'character') return 'character';
  if (lower === 'settlements' || lower === 'settlement') return 'settlement';
  if (lower === 'factions' || lower === 'faction') return 'faction';
  if (lower === 'artifacts' || lower === 'artifact') return 'artifact';
  return 'geography';
}

export type Gender = 'masculine' | 'feminine' | 'any';
export type GeographicFeatureType = 'orogeny' | 'hydrology' | 'wilds';

/**
 * Reversible Anglicization overlay allowing names to toggle between
 * authentic historical orthography and accessible phonetically anglicized variants.
 */
export interface AnglicizationOverlay {
  enabled: boolean;
  mode: 'phonetic' | 'suffix' | 'full';
  anglicizedName: string;
  anglicizedRoot: string;
  anglicizedTitle?: string;
  exonymDualDisplay: boolean;
  phoneticApproximation?: string;
  notes?: string;
}

/**
 * Lore Entity representing a generated character, settlement, or geographic landmark.
 * Stores authentic historical roots and reversible Anglicization overlays.
 */
export interface LoreEntity {
  id: string;
  name: string;
  category: EntityCategory;
  cultureId: string;
  cultureIds?: string[];
  originalName: string;
  originalRoot: string;
  rootName?: string;
  originalTitle?: string;
  parentId?: string;
  children?: LoreEntity[];
  subtype?: string;
  lastBranchSubtype?: string;
  anglicization?: AnglicizationOverlay;
  epithet?: string;
  meaning?: string;
  description?: string;
  pinned?: boolean;
  featureSubtype?: GeographicFeatureType;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

/**
 * Lexical stems and suffixes for a specific geographic domain
 */
export interface GeographicFeatureLexicon {
  stems: string[];
  suffixes: string[];
}

/**
 * Geographic lexicon partitioned by feature domain:
 * - orogeny (mountains, peaks, ridges, highlands)
 * - hydrology (rivers, lakes, springs, marshes)
 * - wilds (forests, steppes, heaths, valleys)
 */
export interface GeographicLexicon {
  orogeny: GeographicFeatureLexicon;
  hydrology: GeographicFeatureLexicon;
  wilds: GeographicFeatureLexicon;
}

/**
 * Culture lexical seeds for anthroponymy and toponymy
 */
export interface CultureLexicon {
  given_names_masculine: string[];
  given_names_feminine: string[];
  surnames: string[];
  settlement_roots: string[];
  prefixes?: string[];
  suffixes?: string[];
  honorific_titles?: string[];
  epithets?: string[];
}

/**
 * Grammar and naming syntactic patterns for character, settlement, and geographic entities
 */
export interface GrammarTemplates {
  character_full_name: string[];
  settlement_name: string[];
  orogeny_name: string[];
  hydrology_name: string[];
  wilds_name: string[];
  honorific_patterns?: string[];
}

/**
 * Complete culture profile definition
 */
export interface CultureProfile {
  id: string;
  name: string;
  historical_era: string;
  region: string;
  description: string;
  phonetic_rules?: {
    vowels?: string[];
    consonants?: string[];
    forbidden_clusters?: string[];
  };
  seeds: CultureLexicon;
  geographic_lexicon: GeographicLexicon;
  grammar_templates: GrammarTemplates;
}

/**
 * Custom seed overrides provided by user or presets
 */
export interface CustomSeedOverrides {
  given_names_masculine?: string[];
  given_names_feminine?: string[];
  surnames?: string[];
  settlement_roots?: string[];
  orogeny_stems?: string[];
  hydrology_stems?: string[];
  wilds_stems?: string[];
  honorific_titles?: string[];
  prefixes?: string[];
  suffixes?: string[];
  epithets?: string[];
}

/**
 * Configuration options for generating lore entities
 */
export interface GenerationConfig {
  cultureId: string;
  category: EntityCategory;
  gender?: Gender;
  featureSubtype?: GeographicFeatureType;
  count?: number;
  anglicize?: boolean;
  customSeeds?: CustomSeedOverrides;
  seed?: number;
}

/**
 * Nomata Project Bible export/import document format (.nomata.json / .nomina.json)
 */
export interface NomataProjectBible {
  version: string;
  name: string;
  entities: LoreEntity[];
  pinnedEntityIds: string[];
  customVocabulary: {
    honorifics?: string[];
    customSeeds?: CustomSeedOverrides;
    customPrefixes?: string[];
    customSuffixes?: string[];
  };
  settings: {
    activeCultureIds: string[];
    cultureWeights?: Record<string, number>;
    anglicize: boolean;
    anglicizeMode: 'phonetic' | 'suffix' | 'full';
    exonymDualDisplay: boolean;
    temperature: number;
    markovOrder: number;
  };
  savedAt: number;
}

export type NominaProjectBible = NomataProjectBible;
