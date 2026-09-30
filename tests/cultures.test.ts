import { describe, it, expect } from 'vitest';
import { cultures, getCultureById, validateCultureProfile } from '../src/data/cultures';
import { RecursiveGrammarEngine } from '../src/engines/grammar';
import type { LoreEntity, AnglicizationOverlay } from '../src/types/domain';

describe('Culture Seed Data', () => {
  it('loads all 5 distinct culture profiles', () => {
    expect(Object.keys(cultures).length).toBe(5);
    expect(cultures).toHaveProperty('danubian_slavic');
    expect(cultures).toHaveProperty('celtic_gaelic');
    expect(cultures).toHaveProperty('nordic_scandian');
    expect(cultures).toHaveProperty('greco_aegean');
    expect(cultures).toHaveProperty('levantine_semitic');
  });

  describe('Bundled culture schema and token consistency', () => {
    it.each(Object.entries(cultures))('validates %s structurally and resolves every static template', (id, culture) => {
      expect(culture.id).toBe(id);
      expect(validateCultureProfile(culture)).toEqual([]);
      const engine = new RecursiveGrammarEngine({ randomFn: () => 0 });
      for (const [key, templates] of Object.entries(culture.grammar_templates)) {
        const featureSubtype = (['orogeny', 'hydrology', 'wilds'] as const).find((feature) => key === `${feature}_name`);
        for (const template of templates) {
          expect(engine.resolve(template, { culture, featureSubtype }), `${id}: ${template}`).not.toMatch(/[{}[\]]/);
        }
      }
    });

    it('rejects malformed pools, missing token sources and broken delimiters', () => {
      const bad = structuredClone(cultures.danubian_slavic);
      bad.seeds.surnames = [];
      bad.grammar_templates.character_full_name = ['{surname} {unknown}', '{given', '[one|two'];
      const errors = validateCultureProfile(bad).join('\n');
      expect(errors).toContain('seeds.surnames');
      expect(errors).toContain('unresolved token {unknown}');
      expect(errors).toContain('unbalanced token braces');
      expect(errors).toContain('unbalanced alternation brackets');
      expect(validateCultureProfile(null).length).toBeGreaterThan(0);
    });

    it('treats phonetic rules as descriptive metadata, not prohibitions on static names', () => {
      const culture = structuredClone(cultures.danubian_slavic);
      culture.phonetic_rules = { vowels: ['a'], consonants: ['z'], forbidden_clusters: ['Br'] };
      culture.seeds.given_names_masculine = ['Branimir'];
      expect(validateCultureProfile(culture)).toEqual([]);
      expect(new RecursiveGrammarEngine({ randomFn: () => 0 }).resolve('{given}', { culture, gender: 'masculine' })).toBe('Branimir');
    });
  });

  it('verifies each culture meets minimum seed thresholds', () => {
    let totalSeeds = 0;
    for (const culture of Object.values(cultures)) {
      expect(culture.seeds.given_names_masculine.length).toBeGreaterThanOrEqual(35);
      expect(culture.seeds.given_names_feminine.length).toBeGreaterThanOrEqual(35);
      expect(culture.seeds.surnames.length).toBeGreaterThanOrEqual(40);
      expect(culture.seeds.settlement_roots.length).toBeGreaterThanOrEqual(30);
      expect(culture.geographic_lexicon.orogeny.stems.length).toBeGreaterThanOrEqual(4);
      expect(culture.geographic_lexicon.hydrology.stems.length).toBeGreaterThanOrEqual(5);
      expect(culture.geographic_lexicon.wilds.stems.length).toBeGreaterThanOrEqual(4);

      totalSeeds += (
        culture.seeds.given_names_masculine.length +
        culture.seeds.given_names_feminine.length +
        culture.seeds.surnames.length +
        culture.seeds.settlement_roots.length
      );
    }
    expect(totalSeeds).toBeGreaterThanOrEqual(500);
  });

  it('provides getCultureById helper working correctly', () => {
    const slavic = getCultureById('danubian_slavic');
    expect(slavic).toBeDefined();
    expect(slavic?.id).toBe('danubian_slavic');

    const nonExistent = getCultureById('non_existent');
    expect(nonExistent).toBeUndefined();
  });

  it('enforces LoreEntity and AnglicizationOverlay schema conformance', () => {
    const overlay: AnglicizationOverlay = {
      enabled: true,
      mode: 'phonetic',
      anglicizedName: 'Branimir',
      anglicizedRoot: 'Bran',
      anglicizedTitle: 'Prince',
      exonymDualDisplay: true,
    };

    const entity: LoreEntity = {
      id: 'entity-1',
      name: 'Branimir',
      category: 'character',
      cultureId: 'danubian_slavic',
      originalName: 'Branimir',
      originalRoot: 'Bran',
      originalTitle: 'Knyaz',
      anglicization: overlay,
      epithet: 'the Brave',
      meaning: 'Defender of Peace',
    };

    expect(entity.anglicization?.enabled).toBe(true);
    expect(entity.anglicization?.mode).toBe('phonetic');
    expect(entity.anglicization?.anglicizedName).toBe('Branimir');
    expect(entity.anglicization?.anglicizedRoot).toBe('Bran');
    expect(entity.anglicization?.anglicizedTitle).toBe('Prince');
    expect(entity.anglicization?.exonymDualDisplay).toBe(true);
    expect(entity.originalTitle).toBe('Knyaz');
  });
});
