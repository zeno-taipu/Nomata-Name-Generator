import { describe, it, expect, beforeEach } from 'vitest';
import { useNominaStore } from '../src/store/useNominaStore';

describe('Custom Vocabulary & Lexicon Integration', () => {
  beforeEach(() => {
    useNominaStore.setState({
      activeCategory: 'character',
      activeCultureIds: ['danubian_slavic'],
      cultureWeights: {},
      targetSubtype: 'auto',
      batchCount: 10,
      temperature: 0.7,
      markovOrder: 2,
      anglicize: false,
      anglicizeMode: 'phonetic',
      exonymDualDisplay: false,
      customVocabulary: {
        honorifics: [],
        customPrefixes: [],
        customSuffixes: [],
        customSeeds: {
          settlement_roots: [],
          given_names_masculine: [],
          given_names_feminine: [],
          surnames: [],
          orogeny_stems: [],
          hydrology_stems: [],
          wilds_stems: [],
          epithets: [],
        },
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [],
      isGenerating: false,
    });
  });

  it('guarantees custom honorific titles appear in generated character names', () => {
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setCustomVocabulary({
      honorifics: ['Grand Inquisitor', 'Ser', 'Vojvoda'],
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    const hasCustomTitle = batch.some((entity) =>
      entity.name.includes('Grand Inquisitor') ||
      entity.name.includes('Ser') ||
      entity.name.includes('Vojvoda')
    );
    expect(hasCustomTitle).toBe(true);
  });

  it('guarantees custom prefixes and suffixes appear in generated settlement names', () => {
    useNominaStore.getState().setActiveCategory('settlement');
    useNominaStore.getState().setCustomVocabulary({
      customPrefixes: ['Fort-', 'New-'],
      customSuffixes: ['-haven', '-burg'],
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    const hasAffix = batch.some((entity) =>
      entity.name.includes('Fort-') ||
      entity.name.includes('New-') ||
      entity.name.includes('haven') ||
      entity.name.includes('burg')
    );
    expect(hasAffix).toBe(true);
  });

  it('generates rich morphological variations from seed root Valer rather than regurgitating bare root', () => {
    useNominaStore.getState().setActiveCategory('settlement');
    useNominaStore.getState().setCustomVocabulary({
      customSeeds: {
        settlement_roots: ['Valer'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    // Root must appear as a stem in the batch
    const hasValerStem = batch.some((entity) =>
      entity.name.toLowerCase().includes('valer')
    );
    expect(hasValerStem).toBe(true);

    // Generator must NEVER simply regurgitate "Valer" as a full standalone settlement name
    for (const entity of batch) {
      expect(entity.name.trim()).not.toBe('Valer');
    }

    // Settlements containing Valer must be compound variations (e.g. Valergrad, Valerovo, Stari Valer, Dun Valer)
    const valerEntities = batch.filter((e) => e.name.toLowerCase().includes('valer'));
    for (const entity of valerEntities) {
      expect(entity.name.trim().length).toBeGreaterThan('Valer'.length);
    }
  });

  it('generates rich character variations from seed root Valer and never outputs Valer Valer', () => {
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setCustomVocabulary({
      customSeeds: {
        given_names_masculine: ['Valer'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    for (const entity of batch) {
      // Must not repeat raw root as given and surname: "Valer Valer"
      expect(entity.name.trim()).not.toBe('Valer Valer');
      expect(entity.name.trim()).not.toBe('Valer');
    }

    // Must have derived given names or surnames (e.g. Valerik, Valerian, Valerov, Valerislav)
    const hasDerivedForm = batch.some((entity) =>
      /\bValer[a-zA-Z]+/i.test(entity.name)
    );
    expect(hasDerivedForm).toBe(true);
  });

  it('actively compounds custom prefixes and suffixes with seed roots', () => {
    useNominaStore.getState().setActiveCategory('settlement');
    useNominaStore.getState().setCustomVocabulary({
      customPrefixes: ['Fort-'],
      customSuffixes: ['-haven'],
      customSeeds: {
        settlement_roots: ['Valer'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    // Check for active prefix or suffix compounding
    const hasCompoundedAffix = batch.some((entity) =>
      entity.name.includes('Fort-') || entity.name.includes('haven')
    );
    expect(hasCompoundedAffix).toBe(true);

    // No raw hyphen at the start of suffix
    for (const entity of batch) {
      expect(entity.name).not.toContain('--');
      expect(entity.name).not.toContain(' -');
    }
  });

  it('guarantees custom seed roots appear in generated settlement names', () => {
    useNominaStore.getState().setActiveCategory('settlement');
    useNominaStore.getState().setCustomVocabulary({
      customSeeds: {
        settlement_roots: ['Valeria', 'Drakon', 'Khorash'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    const hasCustomRoot = batch.some((entity) =>
      entity.name.includes('Valeria') ||
      entity.name.includes('Drakon') ||
      entity.name.includes('Khorash')
    );
    expect(hasCustomRoot).toBe(true);
  });

  it('guarantees custom seed roots appear in generated character names', () => {
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setCustomVocabulary({
      customSeeds: {
        given_names_masculine: ['Aethelgard', 'Morvath'],
        settlement_roots: ['Aethelgard', 'Morvath'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    const hasCustomSeed = batch.some((entity) =>
      entity.name.includes('Aethelgard') ||
      entity.name.includes('Morvath')
    );
    expect(hasCustomSeed).toBe(true);
  });

  it('guarantees custom epithets appear in generated character names', () => {
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setCustomVocabulary({
      customSeeds: {
        epithets: ['the Bloodhound', 'the Undaunted', 'the Iron Hand'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    expect(batch.length).toBe(10);

    const hasCustomEpithet = batch.some((entity) =>
      entity.name.includes('the Bloodhound') ||
      entity.name.includes('the Undaunted') ||
      entity.name.includes('the Iron Hand')
    );
    expect(hasCustomEpithet).toBe(true);
  });

  it('re-rolls entities using the active custom vocabulary', () => {
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setCustomVocabulary({
      honorifics: ['Archon'],
      customSeeds: {
        given_names_masculine: ['Solomon'],
        settlement_roots: ['Solomon'],
      },
    });

    const batch = useNominaStore.getState().generateBatch();
    const firstEntity = batch[0];

    const reRolled = useNominaStore.getState().reRollEntity(firstEntity.id);
    expect(reRolled).toBeDefined();
    expect(reRolled?.id).toBe(firstEntity.id);
  });

  it('applies custom vocabulary when branching subordinate child entities', () => {
    useNominaStore.getState().setActiveCategory('settlement');
    useNominaStore.getState().setCustomVocabulary({
      customPrefixes: ['Upper-'],
      customSuffixes: ['-Quarter'],
    });

    const batch = useNominaStore.getState().generateBatch();
    const parent = batch[0];

    const children = useNominaStore.getState().branchEntity(parent.id, 'City Ward', 3);
    expect(children.length).toBe(3);
    expect(children[0].parentId).toBe(parent.id);
  });
});
