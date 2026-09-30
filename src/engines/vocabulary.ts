/**
 * Custom Vocabulary & Morphological Seed Derivation Engine
 *
 * Expands user seed roots into rich, culturally-inflected variations (given names,
 * patronymic/locative surnames, settlement compounds, geographic landmarks,
 * faction titles, and artifact names) rather than regurgitating raw roots.
 *
 * Formats prefixes and suffixes cleanly to ensure they compound seamlessly
 * across all categories.
 */

import { CultureProfile, EntityCategory, Gender, GeographicFeatureType, normalizeEntityCategory } from '../types/domain';
import type { CustomVocabularyState } from '../store/useNominaStore';

export interface DerivedLexicon {
  givenNames: string[];
  surnames: string[];
  /** Bare stems for further compounding; settlementNames holds complete names. */
  settlementRoots: string[];
  settlementNames: string[];
  stems: string[];
  /** Complete geographic phrases, separate from stems used with suffixes. */
  geographicNames: string[];
  prefixes: string[];
  suffixes: string[];
  honorifics: string[];
  epithets: string[];
  factionRoots: string[];
  artifactRoots: string[];
}

/**
 * Intelligently formats a prefix string:
 * - Hyphenated particles (Al-, Fort-) and apostrophes (O', Mac') remain attached.
 * - Prepositional/word prefixes (Von, De, San, New, Old, Fort, Port, Saint, Mount) get a trailing space.
 * - Combining stems (Belo, Staro, Dun) remain without trailing space.
 */
export function formatPrefix(prefix: string): string {
  if (!prefix) return '';
  const trimmed = prefix.trim();
  if (!trimmed) return '';

  if (trimmed.endsWith('-') || trimmed.endsWith("'")) {
    return trimmed;
  }

  // Prepositional or standalone English / Romance / Germanic word prefixes
  if (/^(von|van|de|da|di|du|san|santa|saint|st\.?|new|old|upper|lower|fort|port|mount|al|great|high)$/i.test(trimmed)) {
    return `${trimmed} `;
  }

  return trimmed;
}

/**
 * Intelligently formats a suffix string:
 * - Strips leading hyphens (-grad -> grad, -ford -> ford).
 * - Leaves standalone words without hyphens (Ward, Reach) with a leading space.
 */
export function formatSuffix(suffix: string): string {
  if (!suffix) return '';
  const trimmed = suffix.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('-')) {
    return trimmed.replace(/^-+/, '');
  }

  // Standalone English toponymic words without leading hyphen
  if (/^(ward|quarter|reach|valley|gate|fort|docks|haven|basin|ridge|heights|cross|ford|falls|springs|point|peak|hollow|vale)$/i.test(trimmed)) {
    return ` ${trimmed}`;
  }

  return trimmed;
}

/**
 * Capitalizes a root stem cleanly: "valer" -> "Valer"
 */
function cleanRoot(r: string): string {
  const trimmed = r.trim().replace(/^[-_]+|[-_]+$/g, '');
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Derives rich morphological variations from user seed roots so that the generator
 * produces organic, diverse names starting from the roots rather than repeating the raw root.
 */
export function deriveVariationsFromRoots(
  roots: string[],
  cultureId: string = 'danubian_slavic'
): DerivedLexicon {
  const cleanRoots = roots
    .map(cleanRoot)
    .filter((r) => r.length > 0);

  const uniqueRoots = Array.from(new Set(cleanRoots));

  const givenNames: string[] = [];
  const surnames: string[] = [];
  const settlementRoots: string[] = [];
  const settlementNames: string[] = [];
  const stems: string[] = [];
  const factionRoots: string[] = [];
  const artifactRoots: string[] = [];

  for (const root of uniqueRoots) {
    // 1. Given Names (Personal Name Inflections)
    // Universal fantasy/epic suffixes
    const universalGiven = [
      `${root}ik`,
      `${root}an`,
      `${root}in`,
      `${root}or`,
      `${root}is`,
      `${root}us`,
      `${root}ius`,
      `${root}ian`,
      `${root}ar`,
      `${root}emir`,
      `${root}mir`,
      `${root}mund`,
      `${root}brand`,
      `${root}wyn`,
      `${root}a`,
      `${root}ia`,
      `${root}ina`,
      `${root}ica`,
      `${root}ka`,
      `${root}dis`,
    ];
    givenNames.push(...universalGiven);

    // Culture-specific given name inflections
    if (cultureId === 'danubian_slavic') {
      givenNames.push(
        `${root}islav`,
        `${root}omir`,
        `${root}oslav`,
        `${root}ko`,
        `${root}ina`,
        `${root}eva`,
        `${root}ost`
      );
    } else if (cultureId === 'celtic_gaelic') {
      givenNames.push(
        `${root}ach`,
        `${root}oc`,
        `${root}an`,
        `${root}aig`,
        `${root}mor`,
        `${root}in`
      );
    } else if (cultureId === 'nordic_scandian') {
      givenNames.push(
        `${root}ald`,
        `${root}stein`,
        `${root}olf`,
        `${root}hild`,
        `${root}var`,
        `${root}r`
      );
    } else if (cultureId === 'greco_aegean') {
      givenNames.push(
        `${root}ios`,
        `${root}on`,
        `${root}ides`,
        `${root}andros`,
        `${root}eia`,
        `${root}istus`
      );
    } else if (cultureId === 'levantine_semitic') {
      givenNames.push(
        `${root}un`,
        `${root}i`,
        `${root}ath`,
        `${root}iel`,
        `${root}am`
      );
    }

    // 2. Surnames (Patronymics & Locatives)
    surnames.push(
      `${root}ov`,
      `${root}ovic`,
      `${root}ev`,
      `${root}ski`,
      `${root}escu`,
      `${root}son`,
      `${root}sen`,
      `Mac ${root}`,
      `O'${root}`,
      `ap ${root}`,
      `de ${root}`,
      `von ${root}`,
      `ibn ${root}`,
      `ben ${root}`,
      `${root}ides`,
      `${root}ton`,
      `${root}by`,
      `${root}ford`
    );

    // 3. Settlements (Never just the raw root!)
    // Suffix compounds
    settlementRoots.push(
      `${root}grad`,
      `${root}ovo`,
      `${root}ica`,
      `${root}by`,
      `${root}heim`,
      `${root}gard`,
      `${root}stad`,
      `${root}polis`,
      `${root}ford`,
      `${root}stead`,
      `${root}haven`,
      `${root}burg`,
      `${root}ton`,
      `${root}ville`,
      `${root}wick`,
      `${root}vale`
    );

    settlementNames.push(
      `${root}grad`,
      `${root}ovo`,
      `Stari ${root}`,
      `Gornji ${root}`,
      `Novo ${root}`,
      `Dun ${root}`,
      `Baile ${root}`,
      `Inis ${root}`,
      `Gamla ${root}`,
      `Ny ${root}`,
      `Nea ${root}`,
      `Tell ${root}`,
      `Kfar ${root}`,
      `Ain ${root}`,
      `New ${root}`,
      `Fort ${root}`,
      `Port ${root}`,
      `${root}ford`,
      `${root}haven`,
      `${root}burg`
    );

    // 4. Geography Stems
    stems.push(
      `Mount ${root}`,
      `${root} Peaks`,
      `${root} Ridge`,
      `${root} Range`,
      `${root} Highlands`,
      `${root} Crags`,
      `${root} Pass`,
      `${root} River`,
      `Lake ${root}`,
      `${root} Waters`,
      `${root} Falls`,
      `${root} Basin`,
      `River ${root}`,
      `Loch ${root}`,
      `${root} Woods`,
      `Forest of ${root}`,
      `${root} Hollow`,
      `Vale of ${root}`,
      `${root} Wilds`,
      `${root} Grove`
    );

    // 5. Factions
    factionRoots.push(
      `House ${root}`,
      `The ${root} Guard`,
      `The ${root} Order`,
      `The ${root} Legion`,
      `The ${root} Covenant`,
      `The ${root} Syndicate`,
      `The ${root} Host`,
      `The Circle of ${root}`
    );

    // 6. Artifacts
    artifactRoots.push(
      `The ${root} Blade`,
      `Crown of ${root}`,
      `The ${root} Eye`,
      `Heart of ${root}`,
      `Staff of ${root}`,
      `The ${root} Relic`,
      `The ${root} Scepter`,
      `The ${root} Fang`,
      `Tome of ${root}`
    );
  }

  return {
    givenNames: Array.from(new Set(givenNames)),
    surnames: Array.from(new Set(surnames)),
    settlementRoots: uniqueRoots,
    settlementNames: Array.from(new Set([...settlementNames, ...settlementRoots])),
    stems: uniqueRoots,
    geographicNames: Array.from(new Set(stems)),
    prefixes: [],
    suffixes: [],
    honorifics: [],
    epithets: [],
    factionRoots: Array.from(new Set(factionRoots)),
    artifactRoots: Array.from(new Set(artifactRoots)),
  };
}

/**
 * Prepares the complete augmented generation context, templates, custom variables,
 * and weighted seed pools for a generation run across all categories.
 */
export function prepareCustomGenerationContext(
  primaryCulture: CultureProfile,
  customVocabulary: CustomVocabularyState | undefined,
  category: EntityCategory,
  options?: { gender?: Gender; featureSubtype?: GeographicFeatureType }
): {
  augmentedCulture: CultureProfile;
  customVariables: Record<string, string | number | string[]>;
  weightedSeeds: string[];
  templates: string[];
} {
  const cs = customVocabulary?.customSeeds;
  category = normalizeEntityCategory(category);
  const cleanPool = (values?: string[]) => (values ?? []).map((value) => value.trim()).filter(Boolean);
  const masculine = cleanPool(cs?.given_names_masculine);
  const feminine = cleanPool(cs?.given_names_feminine);
  const surnames = cleanPool(cs?.surnames);
  const settlementStems = cleanPool(cs?.settlement_roots).map(cleanRoot);
  const geoStems = {
    orogeny: cleanPool(cs?.orogeny_stems),
    hydrology: cleanPool(cs?.hydrology_stems),
    wilds: cleanPool(cs?.wilds_stems),
  };

  // Extract raw user seed roots
  const rawRoots: string[] = [
    ...(cs?.settlement_roots || []),
    ...(cs?.given_names_masculine || []),
    ...(cs?.given_names_feminine || []),
    ...(cs?.surnames || []),
    ...(cs?.orogeny_stems || []),
    ...(cs?.hydrology_stems || []),
    ...(cs?.wilds_stems || []),
  ].filter((r) => r && r.trim().length > 0);

  const uniqueRawRoots = Array.from(new Set(rawRoots));

  // Derive morphological variations
  const derived = deriveVariationsFromRoots(uniqueRawRoots, primaryCulture.id);
  // Derive within the supplied type; never turn a river stem into a given name.
  const masculineNames = [...deriveVariationsFromRoots(masculine, primaryCulture.id).givenNames, ...masculine];
  const feminineNames = [...deriveVariationsFromRoots(feminine, primaryCulture.id).givenNames, ...feminine];
  const settlementNames = deriveVariationsFromRoots(settlementStems, primaryCulture.id).settlementNames;

  // Clean and format prefixes and suffixes
  const formattedPrefixes = [...(customVocabulary?.customPrefixes ?? []), ...(cs?.prefixes ?? [])]
    .map(formatPrefix)
    .filter((p) => p.length > 0);

  const formattedSuffixes = [...(customVocabulary?.customSuffixes ?? []), ...(cs?.suffixes ?? [])]
    .map(formatSuffix)
    .filter((s) => s.length > 0);

  const customHonorifics = cleanPool([...(customVocabulary?.honorifics ?? []), ...(cs?.honorific_titles ?? [])]);
  const customEpithets = (cs?.epithets || []).map((e) => e.trim()).filter((e) => e.length > 0);

  // Build custom variables dictionary
  const customVariables: Record<string, string | number | string[]> = {};

  if (customHonorifics.length > 0) {
    customVariables['title'] = customHonorifics;
    customVariables['honorific_titles'] = customHonorifics;
  }

  if (formattedPrefixes.length > 0) {
    customVariables['prefix'] = formattedPrefixes;
    customVariables['prefixes'] = formattedPrefixes;
  }

  if (formattedSuffixes.length > 0) {
    customVariables['suffix'] = formattedSuffixes;
    customVariables['suffixes'] = formattedSuffixes;
  }

  if (customEpithets.length > 0) {
    customVariables['epithet'] = customEpithets;
    customVariables['epithets'] = customEpithets;
  }

  if (masculineNames.length) customVariables.given_names_masculine = masculineNames;
  if (feminineNames.length) customVariables.given_names_feminine = feminineNames;
  if (surnames.length) {
    customVariables.surname = surnames;
    customVariables.surnames = surnames;
  }
  if (settlementStems.length) {
    customVariables.root = settlementStems;
    customVariables.settlement_root = settlementStems;
    customVariables.settlement_roots = settlementStems;
    customVariables.settlement = settlementNames;
    customVariables.settlement_name = settlementNames;
  }
  for (const [feature, stems] of Object.entries(geoStems)) {
    if (stems.length) {
      customVariables[feature] = stems;
      customVariables[`${feature}.stems`] = stems;
      customVariables[`geographic_lexicon.${feature}.stems`] = stems;
    }
  }

  const selectedGeoStems = options?.featureSubtype
    ? geoStems[options.featureSubtype]
    : Object.values(geoStems).flat();
  const selectedGivenNames = options?.gender === 'masculine' ? masculineNames
    : options?.gender === 'feminine' ? feminineNames : [...masculineNames, ...feminineNames];
  const weightedSeeds = category === 'character' ? [...selectedGivenNames, ...surnames]
    : category === 'settlement' ? settlementNames
    : category === 'geography' ? selectedGeoStems : uniqueRawRoots;

  // Build augmented culture profile
  const augmentedCulture: CultureProfile = {
    ...primaryCulture,
    seeds: {
      ...primaryCulture.seeds,
      given_names_masculine: masculineNames.length > 0
        ? [...masculineNames, ...primaryCulture.seeds.given_names_masculine]
        : primaryCulture.seeds.given_names_masculine,
      given_names_feminine: feminineNames.length > 0
        ? [...feminineNames, ...primaryCulture.seeds.given_names_feminine]
        : primaryCulture.seeds.given_names_feminine,
      settlement_roots: settlementStems.length > 0
        ? [...settlementStems, ...primaryCulture.seeds.settlement_roots]
        : primaryCulture.seeds.settlement_roots,
      surnames: surnames.length > 0
        ? [...surnames, ...primaryCulture.seeds.surnames]
        : primaryCulture.seeds.surnames,
      prefixes: formattedPrefixes.length > 0
        ? [...formattedPrefixes, ...(primaryCulture.seeds.prefixes || [])]
        : primaryCulture.seeds.prefixes,
      suffixes: formattedSuffixes.length > 0
        ? [...formattedSuffixes, ...(primaryCulture.seeds.suffixes || [])]
        : primaryCulture.seeds.suffixes,
      honorific_titles: customHonorifics.length > 0
        ? [...customHonorifics, ...(primaryCulture.seeds.honorific_titles || [])]
        : primaryCulture.seeds.honorific_titles,
      epithets: customEpithets.length > 0
        ? [...customEpithets, ...(primaryCulture.seeds.epithets || [])]
        : primaryCulture.seeds.epithets,
    },
    geographic_lexicon: {
      ...primaryCulture.geographic_lexicon,
      orogeny: {
        ...primaryCulture.geographic_lexicon.orogeny,
        stems: geoStems.orogeny.length > 0
          ? [...geoStems.orogeny, ...primaryCulture.geographic_lexicon.orogeny.stems]
          : primaryCulture.geographic_lexicon.orogeny.stems,
        suffixes: formattedSuffixes.length > 0
          ? [...formattedSuffixes, ...primaryCulture.geographic_lexicon.orogeny.suffixes]
          : primaryCulture.geographic_lexicon.orogeny.suffixes,
      },
      hydrology: {
        ...primaryCulture.geographic_lexicon.hydrology,
        stems: geoStems.hydrology.length > 0
          ? [...geoStems.hydrology, ...primaryCulture.geographic_lexicon.hydrology.stems]
          : primaryCulture.geographic_lexicon.hydrology.stems,
        suffixes: formattedSuffixes.length > 0
          ? [...formattedSuffixes, ...primaryCulture.geographic_lexicon.hydrology.suffixes]
          : primaryCulture.geographic_lexicon.hydrology.suffixes,
      },
      wilds: {
        ...primaryCulture.geographic_lexicon.wilds,
        stems: geoStems.wilds.length > 0
          ? [...geoStems.wilds, ...primaryCulture.geographic_lexicon.wilds.stems]
          : primaryCulture.geographic_lexicon.wilds.stems,
        suffixes: formattedSuffixes.length > 0
          ? [...formattedSuffixes, ...primaryCulture.geographic_lexicon.wilds.suffixes]
          : primaryCulture.geographic_lexicon.wilds.suffixes,
      },
    },
  };

  // Affix-only configurations still need an actual stem, not an unresolved token.
  const rootStems = category === 'geography'
    ? (selectedGeoStems.length ? selectedGeoStems : options?.featureSubtype
      ? primaryCulture.geographic_lexicon[options.featureSubtype].stems
      : Object.values(primaryCulture.geographic_lexicon).flatMap((pool) => pool.stems))
    : settlementStems.length ? settlementStems : primaryCulture.seeds.settlement_roots;
  if (category === 'geography' && options?.featureSubtype) {
    customVariables.stem = rootStems;
  }
  // Defer the geographic alias until grammar has the per-entity feature subtype.
  customVariables.root_stem = category === 'geography' ? '{stem}' : rootStems;
  customVariables.raw_root = customVariables.root_stem;

  // Build candidate templates tailored to active custom vocabulary
  let templates: string[] = [];

  const hasPrefixes = formattedPrefixes.length > 0;
  const hasSuffixes = formattedSuffixes.length > 0;
  const hasRoots = category === 'geography' ? selectedGeoStems.length > 0 : settlementStems.length > 0;
  const hasHonorifics = customHonorifics.length > 0;
  const hasEpithets = customEpithets.length > 0;

  if (category === 'character') {
    templates = [...(augmentedCulture.grammar_templates?.character_full_name || ['{given} {surname}'])];
    if (hasPrefixes) {
      templates = [
        '{given} {prefix}{surname}',
        '{given} {prefix}{root_stem}',
        '{title} {given} {prefix}{root_stem}',
        ...templates,
      ];
    }
    if (hasSuffixes) {
      templates = [
        '{given} {surname} {suffix}',
        '{given} of {root_stem}{suffix}',
        ...templates,
      ];
    }
    if (hasHonorifics) {
      templates = [
        '{title} {given} {surname}',
        '{title} {given}',
        '{title} {given} of {settlement}',
        '{title} {given} {epithet}',
        ...templates,
      ];
    }
    if (hasEpithets) {
      templates = [
        '{given} {epithet}',
        '{title} {given} {epithet}',
        '{given} {surname} {epithet}',
        ...templates,
      ];
    }
  } else if (category === 'settlement') {
    templates = [...(augmentedCulture.grammar_templates?.settlement_name || ['{root}'])];
    if (settlementNames.length) {
      templates = templates.map((template) => template === '{root}' ? '{settlement_name}' : template);
    }
    if (hasPrefixes && hasRoots) {
      templates = [
        '{prefix}{root_stem}',
        '{prefix}{root}',
        ...templates,
      ];
    }
    if (hasSuffixes && hasRoots) {
      templates = [
        '{root_stem}{suffix}',
        '{root}{suffix}',
        ...templates,
      ];
    }
    if (hasPrefixes && hasSuffixes && hasRoots) {
      templates = [
        '{prefix}{root_stem}{suffix}',
        '{prefix}{root}{suffix}',
        ...templates,
      ];
    }
    if (hasPrefixes && !hasRoots) {
      templates = [
        '{prefix}{root}',
        ...templates,
      ];
    }
    if (hasSuffixes && !hasRoots) {
      templates = [
        '{root}{suffix}',
        ...templates,
      ];
    }
  } else if (category === 'geography') {
    const cultureGeoTemplates = options?.featureSubtype
      ? augmentedCulture.grammar_templates[`${options.featureSubtype}_name`]
      : [
      ...(augmentedCulture.grammar_templates?.orogeny_name || []),
      ...(augmentedCulture.grammar_templates?.hydrology_name || []),
      ...(augmentedCulture.grammar_templates?.wilds_name || []),
    ];
    templates = cultureGeoTemplates.length > 0 ? cultureGeoTemplates : ['{stem}'];

    if (hasRoots) {
      templates = [
        '{stem}',
        ...templates,
      ];
    }
    if (hasPrefixes) {
      templates = [
        '{prefix}{stem}',
        '{prefix}{root_stem}',
        ...templates,
      ];
    }
    if (hasSuffixes) {
      templates = [
        '{stem}{suffix}',
        '{root_stem}{suffix}',
        ...templates,
      ];
    }
    if (hasPrefixes && hasSuffixes) {
      templates = [
        '{prefix}{stem}{suffix}',
        '{prefix}{root_stem}{suffix}',
        ...templates,
      ];
    }
  } else if (category === 'faction') {
    templates = [
      'The [Order|Brotherhood|Guild|League|Circle|Host|Syndicate] of [the|] {Markov}',
      'The {Markov} [Order|Legion|Covenant|Watch|Pact|Guard]',
      'The [Iron|Silver|Golden|Black|Crimson|Shadow] {Markov}',
      'House {Markov}',
    ];
    if (derived.factionRoots.length > 0) {
      templates = [...derived.factionRoots, ...templates];
    }
    if (hasPrefixes) {
      templates = [
        'The {prefix}{Markov} Order',
        'House {prefix}{Markov}',
        ...templates,
      ];
    }
    if (hasSuffixes) {
      templates = [
        'The {Markov}{suffix} League',
        'The {Markov}{suffix} Covenant',
        ...templates,
      ];
    }
  } else if (category === 'artifact') {
    templates = [
      'The [Blade|Sword|Spear|Shield|Crown|Ring|Amulet|Tome|Orb] of [the|] {Markov}',
      'The {Markov} [Blade|Fang|Eye|Heart|Scepter|Staff|Chalice]',
      "{Markov}'s [Edge|Promise|Vengeance|Legacy|Hope]",
    ];
    if (derived.artifactRoots.length > 0) {
      templates = [...derived.artifactRoots, ...templates];
    }
    if (hasPrefixes) {
      templates = [
        'The {prefix}{Markov} Blade',
        'The {prefix}{Markov} Crown',
        ...templates,
      ];
    }
    if (hasSuffixes) {
      templates = [
        'The {Markov}{suffix} Blade',
        'The {Markov}{suffix} Orb',
        ...templates,
      ];
    }
  }

  return {
    augmentedCulture,
    customVariables,
    weightedSeeds,
    templates,
  };
}
