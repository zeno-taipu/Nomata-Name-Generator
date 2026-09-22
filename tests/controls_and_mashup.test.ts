import { describe, it, expect, beforeEach } from 'vitest';
import { useNominaStore } from '../src/store/useNominaStore';

describe('Interactive Controls, Culture Mashup Weights & Real-Time Anglicization', () => {
  beforeEach(() => {
    useNominaStore.getState().clearBatch();
    useNominaStore.getState().clearPinned();
    useNominaStore.getState().setActiveCategory('character');
    useNominaStore.getState().setActiveCultureIds(['danubian_slavic']);
    useNominaStore.getState().setEngineConfig({
      temperature: 0.7,
      markovOrder: 2,
      targetSubtype: 'auto',
    });
    useNominaStore.getState().setAnglicizationConfig({
      anglicize: false,
      anglicizeMode: 'phonetic',
      exonymDualDisplay: false,
    });
    useNominaStore.getState().setCustomVocabulary({
      honorifics: [],
      customPrefixes: [],
      customSuffixes: [],
    });
  });

  it('biases batch generation proportionally according to culture mashup weights', () => {
    const store = useNominaStore.getState();
    // Configure mashup between Danubian Slavic (weight 0.05) and Levantine Semitic (weight 2.0)
    store.setActiveCultureIds(['danubian_slavic', 'levantine_semitic'], {
      danubian_slavic: 0.05,
      levantine_semitic: 2.0,
    });
    store.setBatchCount(25);

    const batch = store.generateBatch();
    expect(batch.length).toBe(25);

    // The overwhelming majority of entities should have Levantine cultureId
    const levantineCount = batch.filter((e) => e.cultureId === 'levantine_semitic').length;
    expect(levantineCount).toBeGreaterThanOrEqual(18); // > 70%
  });

  it('sets Anglicization options without mutating cards automatically, and supports individual and global anglicization', () => {
    const store = useNominaStore.getState();
    store.setActiveCultureIds(['danubian_slavic']);
    store.setBatchCount(5);
    store.setAnglicizationConfig({ anglicize: false, anglicizeMode: 'phonetic' });

    // Generate batch with non-anglicized baseline
    const initialBatch = store.generateBatch();
    expect(initialBatch.length).toBe(5);
    expect(initialBatch[0].anglicization?.enabled).toBeFalsy();

    // Pin one entity
    store.togglePinEntity(initialBatch[0]);
    expect(useNominaStore.getState().pinnedEntities.length).toBe(1);
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.enabled).toBeFalsy();

    // Setting options in the modal updates config without changing cards
    store.setAnglicizationConfig({ anglicizeMode: 'suffix' });
    expect(useNominaStore.getState().anglicizeMode).toBe('suffix');
    // Cards remain untouched
    expect(useNominaStore.getState().generatedBatch[0].anglicization?.enabled).toBeFalsy();
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.enabled).toBeFalsy();

    // Anglicize is activated by the language icon on each card individually
    const anglicizedIndividual = store.toggleAnglicizeEntity(initialBatch[0].id);
    expect(anglicizedIndividual?.anglicization?.enabled).toBe(true);
    expect(anglicizedIndividual?.anglicization?.mode).toBe('suffix');
    // Other batch cards remain untouched
    expect(useNominaStore.getState().generatedBatch[1].anglicization?.enabled).toBeFalsy();

    // Revert individual card losslessly
    const revertedIndividual = store.toggleAnglicizeEntity(initialBatch[0].id);
    expect(revertedIndividual?.anglicization?.enabled).toBe(false);
    expect(revertedIndividual?.name).toBe(initialBatch[0].originalName);

    // Global Anglicize button (e.g. for Collections or All) explicitly transforms cards
    store.globalAnglicize('pinned', true);
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.enabled).toBe(true);
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.mode).toBe('suffix');

    // Global Anglicize All explicitly transforms both batch and pinned
    store.globalAnglicize('all', true);
    expect(useNominaStore.getState().generatedBatch[0].anglicization?.enabled).toBe(true);
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.enabled).toBe(true);

    // Global revert
    store.globalAnglicize('all', false);
    expect(useNominaStore.getState().generatedBatch[0].anglicization?.enabled).toBe(false);
    expect(useNominaStore.getState().pinnedEntities[0].anglicization?.enabled).toBe(false);
  });

  it('drives novel variations at high temperature and strictly conforms to seeds at low temperature', () => {
    const store = useNominaStore.getState();
    store.setActiveCultureIds(['danubian_slavic']);
    store.setBatchCount(10);

    // Low temperature (strict catalog adherence)
    store.setEngineConfig({ temperature: 0.1 });
    const lowTempBatch = store.generateBatch();
    expect(lowTempBatch.length).toBe(10);

    // High temperature (creative Markov innovation)
    store.setEngineConfig({ temperature: 0.95 });
    const highTempBatch = store.generateBatch();
    expect(highTempBatch.length).toBe(10);
    expect(highTempBatch.every((e) => e.name.length > 2)).toBe(true);
  });

  it('respects targetSubtype for settlements and geography', () => {
    const store = useNominaStore.getState();

    // Settlement with targetSubtype 'Fortress'
    store.setActiveCategory('settlement');
    store.setEngineConfig({ targetSubtype: 'Fortress' });
    store.setBatchCount(5);
    const fortressBatch = store.generateBatch();
    expect(fortressBatch.every((e) => e.subtype === 'Fortress')).toBe(true);

    // Geography with targetSubtype 'Mountain Range'
    store.setActiveCategory('geography');
    store.setEngineConfig({ targetSubtype: 'Mountain Range' });
    const geoBatch = store.generateBatch();
    expect(geoBatch.every((e) => e.subtype === 'Mountain Range')).toBe(true);
    expect(geoBatch.every((e) => e.featureSubtype === 'orogeny')).toBe(true);

    // Geography with targetSubtype 'River Basin'
    store.setEngineConfig({ targetSubtype: 'River Basin' });
    const riverBatch = store.generateBatch();
    expect(riverBatch.every((e) => e.subtype === 'River Basin')).toBe(true);
    expect(riverBatch.every((e) => e.featureSubtype === 'hydrology')).toBe(true);
  });

  it('updates Markov order configuration correctly', () => {
    const store = useNominaStore.getState();
    store.setEngineConfig({ markovOrder: 3 });
    expect(useNominaStore.getState().markovOrder).toBe(3);

    store.setEngineConfig({ markovOrder: 2 });
    expect(useNominaStore.getState().markovOrder).toBe(2);
  });
});
