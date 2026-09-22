/**
 * Structural/token checks for the bundled datasets, not linguistic or historical
 * certification. In particular, descriptive phonetic metadata is not enforced.
 */
export function validateCultureProfile(input: unknown): string[] {
  const errors: string[] = [];
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : {};
  const culture = record(input);
  const strings = (value: unknown): value is string[] =>
    Array.isArray(value) && value.length > 0 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0);
  for (const key of ['id', 'name', 'historical_era', 'region', 'description']) {
    if (typeof culture[key] !== 'string' || !(culture[key] as string).trim()) errors.push(`${key}: expected nonempty text`);
  }
  const seeds = record(culture.seeds);
  const requiredSeeds = ['given_names_masculine', 'given_names_feminine', 'surnames', 'settlement_roots'];
  const optionalSeeds = ['prefixes', 'suffixes', 'honorific_titles', 'epithets'];
  for (const key of [...requiredSeeds, ...optionalSeeds.filter((key) => key in seeds)]) {
    if (!strings(seeds[key])) errors.push(`seeds.${key}: expected nonempty string pool`);
  }
  const geo = record(culture.geographic_lexicon);
  const features = ['orogeny', 'hydrology', 'wilds'];
  for (const feature of features) {
    for (const key of ['stems', 'suffixes']) {
      if (!strings(record(geo[feature])[key])) errors.push(`geographic_lexicon.${feature}.${key}: expected nonempty string pool`);
    }
  }
  if (culture.phonetic_rules !== undefined) {
    const rules = record(culture.phonetic_rules);
    for (const [key, value] of Object.entries(rules)) {
      if (!['vowels', 'consonants', 'forbidden_clusters'].includes(key) ||
          !Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim())) {
        errors.push(`phonetic_rules.${key}: expected string array`);
      }
    }
    if (culture.phonetic_rules === null || typeof culture.phonetic_rules !== 'object' || Array.isArray(culture.phonetic_rules)) {
      errors.push('phonetic_rules: expected object');
    }
  }
  const templates = record(culture.grammar_templates);
  const requiredTemplates = ['character_full_name', 'settlement_name', ...features.map((feature) => `${feature}_name`)];
  for (const key of [...requiredTemplates, ...('honorific_patterns' in templates ? ['honorific_patterns'] : [])]) {
    const pool = templates[key];
    if (!strings(pool)) {
      errors.push(`grammar_templates.${key}: expected nonempty string pool`);
      continue;
    }
    const feature = features.find((feature) => key === `${feature}_name`);
    const aliases: Record<string, unknown> = {
      given: seeds.given_names_masculine, given_name: seeds.given_names_masculine,
      surname: seeds.surnames, settlement: seeds.settlement_roots,
      settlement_root: seeds.settlement_roots, root: seeds.settlement_roots,
      title: seeds.honorific_titles, honorific_title: seeds.honorific_titles,
      epithet: seeds.epithets, prefix: seeds.prefixes,
      stem: feature ? record(geo[feature]).stems : undefined,
      suffix: feature ? record(geo[feature]).suffixes : seeds.suffixes,
    };
    for (const template of pool) {
      // All bundled templates are static lexical templates (no parent/custom hooks).
      for (const match of template.matchAll(/\{([^{}]+)\}/g)) {
        const token = match[1];
        const parts = token.replace(/^geographic_lexicon\./, '').split('.');
        const value = aliases[token] ?? seeds[token] ??
          (features.includes(token) ? record(geo[token]).stems : undefined) ??
          (parts.length === 2 ? record(geo[parts[0]])[parts[1]] : undefined);
        if (!strings(value)) errors.push(`grammar_templates.${key}: unresolved token {${token}}`);
      }
      if (/[{}]/.test(template.replace(/\{[^{}]+\}/g, ''))) {
        errors.push(`grammar_templates.${key}: unbalanced token braces`);
      }
      let depth = 0;
      for (const char of template) {
        if (char === '[') depth++;
        if (char === ']') depth--;
        if (depth < 0) break;
      }
      if (depth !== 0) errors.push(`grammar_templates.${key}: unbalanced alternation brackets`);
    }
  }
  return errors;
}
