import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNominaStore } from '../src/store/useNominaStore';
import { usePersistenceStatus } from '../src/store/persistenceStatus';
import type { LoreEntity } from '../src/types/domain';
import { cultures } from '../src/data/cultures';
import { MarkovNameGenerator } from '../src/engines/markov';
import { RecursiveGrammarEngine } from '../src/engines/grammar';

describe('useNominaStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    usePersistenceStatus.setState({ error: null });
  });

  beforeEach(() => {
    // Reset store state between tests
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
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [],
      isGenerating: false,
    });
  });

  describe('Default State', () => {
    it('initializes with expected domain defaults', () => {
      const state = useNominaStore.getState();

      expect(state.activeCategory).toBe('character');
      expect(state.activeCultureIds).toEqual(['danubian_slavic']);
      expect(state.cultureWeights).toEqual({});
      expect(state.targetSubtype).toBe('auto');
      expect(state.batchCount).toBe(10);
      expect(state.temperature).toBe(0.7);
      expect(state.markovOrder).toBe(2);
      expect(state.anglicize).toBe(false);
      expect(state.anglicizeMode).toBe('phonetic');
      expect(state.exonymDualDisplay).toBe(false);
      expect(state.generatedBatch).toEqual([]);
      expect(state.activeEntityId).toBeNull();
      expect(state.pinnedEntities).toEqual([]);
      expect(state.isGenerating).toBe(false);
    });
  });

  describe('Config Actions', () => {
    it('updates activeCategory', () => {
      useNominaStore.getState().setActiveCategory('settlement');
      expect(useNominaStore.getState().activeCategory).toBe('settlement');
    });

    it('updates activeCultureIds and weights', () => {
      useNominaStore.getState().setActiveCultureIds(['danubian_slavic', 'celtic_gaelic'], {
        danubian_slavic: 1.0,
        celtic_gaelic: 0.5,
      });

      const state = useNominaStore.getState();
      expect(state.activeCultureIds).toEqual(['danubian_slavic', 'celtic_gaelic']);
      expect(state.cultureWeights).toEqual({ danubian_slavic: 1.0, celtic_gaelic: 0.5 });
    });

    it('updates batchCount', () => {
      useNominaStore.getState().setBatchCount(25);
      expect(useNominaStore.getState().batchCount).toBe(25);
    });

    it('updates engine configuration', () => {
      useNominaStore.getState().setActiveCategory('settlement');
      useNominaStore.getState().setEngineConfig({
        temperature: 0.9,
        markovOrder: 3,
        targetSubtype: 'Metropolis',
      });

      const state = useNominaStore.getState();
      expect(state.temperature).toBe(0.9);
      expect(state.markovOrder).toBe(3);
      expect(state.targetSubtype).toBe('Metropolis');
    });

    it('resets an incompatible subtype atomically when the category changes', () => {
      const store = useNominaStore.getState();
      store.setEngineConfig({ targetSubtype: 'Warrior' });
      store.setActiveCategory('settlement');
      expect(useNominaStore.getState().targetSubtype).toBe('auto');
      expect(store.generateBatch().every((entity) => entity.subtype !== 'Warrior')).toBe(true);
    });

    it('rejects invalid subtype configuration without mutating state', () => {
      const store = useNominaStore.getState();
      expect(() => store.setEngineConfig({ targetSubtype: 'Metropolis', temperature: 0.9 }))
        .toThrow('Invalid subtype');
      expect(useNominaStore.getState().temperature).toBe(0.7);
      expect(useNominaStore.getState().targetSubtype).toBe('auto');
    });

    it('rejects stale invalid persisted subtypes before starting generation', () => {
      useNominaStore.setState({ activeCategory: 'settlement', targetSubtype: 'Warrior' });
      expect(() => useNominaStore.getState().generateBatch()).toThrow('Invalid subtype');
      expect(useNominaStore.getState().isGenerating).toBe(false);
    });

    it('updates anglicization configuration', () => {
      useNominaStore.getState().setAnglicizationConfig({
        anglicize: true,
        anglicizeMode: 'suffix',
        exonymDualDisplay: true,
      });

      const state = useNominaStore.getState();
      expect(state.anglicize).toBe(true);
      expect(state.anglicizeMode).toBe('suffix');
      expect(state.exonymDualDisplay).toBe(true);
    });

    it('updates custom vocabulary', () => {
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Grand Voivode', 'High Lord'],
        customPrefixes: ['Belo-'],
      });

      const vocab = useNominaStore.getState().customVocabulary;
      expect(vocab.honorifics).toEqual(['Grand Voivode', 'High Lord']);
      expect(vocab.customPrefixes).toEqual(['Belo-']);
    });

    it('updates activeEntityId', () => {
      useNominaStore.getState().setActiveEntityId('entity-123');
      expect(useNominaStore.getState().activeEntityId).toBe('entity-123');
    });
  });

  describe('generateBatch', () => {
    it('clears the busy flag and preserves the batch if generation fails', () => {
      const store = useNominaStore.getState();
      const previous = store.generateBatch();
      vi.spyOn(MarkovNameGenerator.prototype, 'trainWithWeights')
        .mockImplementation(() => { throw new Error('Invalid training data'); });
      expect(() => store.generateBatch()).toThrow('Invalid training data');
      expect(useNominaStore.getState().isGenerating).toBe(false);
      expect(useNominaStore.getState().generatedBatch).toBe(previous);
    });

    it('generates requested number of entities for active category', () => {
      useNominaStore.getState().setBatchCount(5);
      const batch = useNominaStore.getState().generateBatch();

      expect(batch.length).toBe(5);
      expect(useNominaStore.getState().generatedBatch.length).toBe(5);

      for (const entity of batch) {
        expect(entity.id).toBeDefined();
        expect(entity.name).toBeDefined();
        expect(entity.name.length).toBeGreaterThan(0);
        expect(entity.originalName).toBeDefined();
        expect(entity.category).toBe('character');
        expect(entity.cultureId).toBe('danubian_slavic');
      }
    });

    it('generates settlements when category is settlement', () => {
      useNominaStore.getState().setActiveCategory('settlement');
      useNominaStore.getState().setBatchCount(3);
      const batch = useNominaStore.getState().generateBatch();

      expect(batch.length).toBe(3);
      for (const entity of batch) {
        expect(entity.category).toBe('settlement');
      }
    });

    it('generates geography entities with featureSubtypes', () => {
      useNominaStore.getState().setActiveCategory('geography');
      useNominaStore.getState().setBatchCount(3);
      const batch = useNominaStore.getState().generateBatch();

      expect(batch.length).toBe(3);
      for (const entity of batch) {
        expect(entity.category).toBe('geography');
        expect(['orogeny', 'hydrology', 'wilds']).toContain(entity.featureSubtype);
      }
    });

    it('uses feature-specific templates and training pools for generation and root rerolls', () => {
      const store = useNominaStore.getState();
      store.setActiveCategory('geography');
      store.setEngineConfig({ targetSubtype: 'River Basin' });
      store.setBatchCount(3);
      const trainWeighted = vi.spyOn(MarkovNameGenerator.prototype, 'trainWithWeights');
      const resolve = vi.spyOn(RecursiveGrammarEngine.prototype, 'resolve');
      const culture = cultures.danubian_slavic;

      const batch = store.generateBatch();
      expect(trainWeighted.mock.calls[0][0][0].seeds).toEqual(culture.geographic_lexicon.hydrology.stems);
      for (const [template] of resolve.mock.calls) {
        expect(culture.grammar_templates.hydrology_name).toContain(template);
      }

      resolve.mockClear();
      const train = vi.spyOn(MarkovNameGenerator.prototype, 'train');
      store.reRollEntity(batch[0].id);
      expect(train.mock.calls[0][0]).toEqual(culture.geographic_lexicon.hydrology.stems);
      expect(culture.grammar_templates.hydrology_name).toContain(resolve.mock.calls[0][0]);
    });

    it('does not train river fallbacks with custom mountain or personal roots', () => {
      const store = useNominaStore.getState();
      store.setActiveCategory('geography');
      store.setEngineConfig({ targetSubtype: 'River Basin' });
      store.setCustomVocabulary({
        customSeeds: {
          hydrology_stems: ['Rillora'],
          orogeny_stems: ['Cragora'],
          given_names_masculine: ['Personora'],
        },
      });
      const train = vi.spyOn(MarkovNameGenerator.prototype, 'trainWithWeights');
      store.generateBatch();
      const customSeeds = train.mock.calls[0][0].find((pool) => pool.weight === 3.5)?.seeds;
      expect(customSeeds?.length).toBeGreaterThan(0);
      expect(customSeeds?.some((seed) => /cragora|personora/i.test(seed))).toBe(false);
    });

    it('applies anglicization overlay when anglicize is true', () => {
      useNominaStore.getState().setAnglicizationConfig({
        anglicize: true,
        anglicizeMode: 'phonetic',
      });
      useNominaStore.getState().setBatchCount(3);
      const batch = useNominaStore.getState().generateBatch();

      expect(batch.length).toBe(3);
      for (const entity of batch) {
        expect(entity.anglicization).toBeDefined();
        expect(entity.anglicization?.enabled).toBe(true);
      }
    });

    it('supports multi-culture blend', () => {
      useNominaStore.getState().setActiveCultureIds(['danubian_slavic', 'celtic_gaelic'], {
        danubian_slavic: 1.0,
        celtic_gaelic: 1.0,
      });
      useNominaStore.getState().setBatchCount(4);
      const batch = useNominaStore.getState().generateBatch();

      expect(batch.length).toBe(4);
      for (const entity of batch) {
        expect(entity.cultureIds).toEqual(['danubian_slavic', 'celtic_gaelic']);
      }
    });
  });

  describe('branchEntity', () => {
    it('branches child entities from a parent settlement into wards', () => {
      useNominaStore.getState().setActiveCategory('settlement');
      useNominaStore.getState().setBatchCount(1);
      const [parent] = useNominaStore.getState().generateBatch();

      const children = useNominaStore.getState().branchEntity(parent.id, 'City Ward', 2);
      expect(children.length).toBe(2);
      expect(children[0].parentId).toBe(parent.id);

      // Verify parent in store updated with children
      const updatedParent = useNominaStore.getState().generatedBatch.find((e) => e.id === parent.id);
      expect(updatedParent?.children?.length).toBe(2);
      expect(updatedParent?.children?.[0].id).toBe(children[0].id);
    });
  });

  describe('reRollEntity', () => {
    it('re-generates an entity while preserving its ID', () => {
      useNominaStore.getState().setBatchCount(1);
      const [original] = useNominaStore.getState().generateBatch();
      const originalName = original.name;
      expect(originalName).toBeDefined();

      const rerolled = useNominaStore.getState().reRollEntity(original.id);
      expect(rerolled).toBeDefined();
      expect(rerolled?.id).toBe(original.id);
      expect(rerolled?.category).toBe(original.category);

      const batchEntity = useNominaStore.getState().generatedBatch.find((e) => e.id === original.id);
      expect(batchEntity?.id).toBe(original.id);
    });

    it('re-rolls a branched child entity without corrupting the parent entity', () => {
      useNominaStore.getState().setActiveCategory('settlements');
      useNominaStore.getState().setBatchCount(1);
      const [parent] = useNominaStore.getState().generateBatch();

      const [child] = useNominaStore.getState().branchEntity(parent.id, 'City Ward', 1);
      expect(child).toBeDefined();
      expect(child.parentId).toBe(parent.id);

      const rerolledChild = useNominaStore.getState().reRollEntity(child.id);
      expect(rerolledChild).toBeDefined();
      expect(rerolledChild?.id).toBe(child.id);
      expect(rerolledChild?.parentId).toBe(parent.id);

      const updatedParent = useNominaStore.getState().generatedBatch.find((e) => e.id === parent.id);
      expect(updatedParent?.children?.length).toBe(1);
      expect(updatedParent?.children?.[0].id).toBe(child.id);
    });

    it('re-rolls factions and artifacts preserving appropriate templates', () => {
      useNominaStore.getState().setActiveCategory('factions');
      useNominaStore.getState().setBatchCount(1);
      const [faction] = useNominaStore.getState().generateBatch();

      const rerolledFaction = useNominaStore.getState().reRollEntity(faction.id);
      expect(rerolledFaction).toBeDefined();
      expect(rerolledFaction?.id).toBe(faction.id);
      expect(rerolledFaction?.name.length).toBeGreaterThan(3);

      useNominaStore.getState().setActiveCategory('artifacts');
      useNominaStore.getState().setBatchCount(1);
      const [artifact] = useNominaStore.getState().generateBatch();

      const rerolledArtifact = useNominaStore.getState().reRollEntity(artifact.id);
      expect(rerolledArtifact).toBeDefined();
      expect(rerolledArtifact?.id).toBe(artifact.id);
      expect(rerolledArtifact?.name.length).toBeGreaterThan(3);
    });
  });

  describe('toggleAnglicizeEntity', () => {
    it('toggles entity anglicization losslessly', () => {
      useNominaStore.getState().setAnglicizationConfig({
        anglicize: false,
        anglicizeMode: 'phonetic',
      });
      useNominaStore.getState().setBatchCount(1);
      const [entity] = useNominaStore.getState().generateBatch();

      // Toggle ON
      const anglicized = useNominaStore.getState().toggleAnglicizeEntity(entity.id);
      expect(anglicized?.anglicization?.enabled).toBe(true);

      // Toggle OFF (lossless reversion)
      const reverted = useNominaStore.getState().toggleAnglicizeEntity(entity.id);
      expect(reverted?.anglicization?.enabled).toBe(false);
      expect(reverted?.name).toBe(entity.originalName);
    });
  });

  describe('togglePinEntity', () => {
    it('synchronizes nested pin flags in both trees and bulk pin operations', () => {
      const store = useNominaStore.getState();
      store.setBatchCount(1);
      const [parent] = store.generateBatch();
      const [child] = store.branchEntity(parent.id);
      store.togglePinEntity(parent);
      store.togglePinEntity(child);
      const pinnedParent = () => useNominaStore.getState().pinnedEntities.find((p) => p.id === parent.id);
      expect(pinnedParent()?.children?.[0].pinned).toBe(true);
      expect(useNominaStore.getState().generatedBatch[0].children?.[0].pinned).toBe(true);

      store.togglePinEntity(child);
      expect(pinnedParent()?.children?.[0].pinned).toBe(false);
      store.togglePinEntity(child);
      store.pinAllBatch();
      expect(useNominaStore.getState().generatedBatch[0].pinned).toBe(false);
      expect(useNominaStore.getState().generatedBatch[0].children?.[0].pinned).toBe(true);
      store.pinAllBatch();
      store.clearBatch();
      expect(pinnedParent()?.children?.[0].pinned).toBe(true);
      store.togglePinEntity(child);
      expect(pinnedParent()?.children?.[0].pinned).toBe(false);
    });

    it('pins and unpins entities cleanly', () => {
      const entity: LoreEntity = {
        id: 'ent-1',
        name: 'Miroslav',
        originalName: 'Miroslav',
        originalRoot: 'Miroslav',
        category: 'character',
        cultureId: 'danubian_slavic',
      };

      // Pin
      useNominaStore.getState().togglePinEntity(entity);
      expect(useNominaStore.getState().pinnedEntities.length).toBe(1);
      expect(useNominaStore.getState().pinnedEntities[0].id).toBe('ent-1');
      expect(useNominaStore.getState().pinnedEntities[0].pinned).toBe(true);

      // Unpin
      useNominaStore.getState().togglePinEntity(entity);
      expect(useNominaStore.getState().pinnedEntities.length).toBe(0);
    });
  });

  describe('saveProjectBible & loadProjectBible', () => {
    it('keeps the project exportable when autosave fails', () => {
      vi.stubGlobal('window', {
        get localStorage() { throw new Error('Storage access denied'); },
      });
      useNominaStore.getState().setCustomVocabulary({ honorifics: ['Recovery Title'] });
      expect(usePersistenceStatus.getState().error).toContain('Storage access denied');
      expect(useNominaStore.getState().saveProjectBible().customVocabulary.honorifics)
        .toEqual(['Recovery Title']);
    });

    it('rejects malformed imports before replacing or persisting the current project', () => {
      const store = useNominaStore.getState();
      store.setBatchCount(1);
      store.generateBatch();
      const before = useNominaStore.getState();
      const valid = store.saveProjectBible();
      const invalid = { ...valid, entities: [{ ...valid.entities[0], name: 42 }] };
      expect(() => store.loadProjectBible(invalid)).toThrow(/name/);
      expect(useNominaStore.getState()).toBe(before);
    });

    it('restores nested pin membership and detaches imported entity trees', () => {
      const store = useNominaStore.getState();
      store.setBatchCount(1);
      const [parent] = store.generateBatch();
      const [child] = store.branchEntity(parent.id);
      const bible = store.saveProjectBible();
      bible.pinnedEntityIds = [child.id];
      store.loadProjectBible(bible);
      expect(useNominaStore.getState().pinnedEntities[0].id).toBe(child.id);
      expect(useNominaStore.getState().generatedBatch[0].children?.[0].pinned).toBe(true);
      bible.entities[0].name = 'External mutation';
      expect(useNominaStore.getState().generatedBatch[0].name).toBe(parent.name);
    });

    it('saves and restores world bible state', () => {
      useNominaStore.getState().setActiveCategory('character');
      useNominaStore.getState().setActiveCultureIds(['greco_aegean']);
      useNominaStore.getState().setEngineConfig({ temperature: 0.85, markovOrder: 3 });
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Strategos', 'Archon'],
      });

      const entity: LoreEntity = {
        id: 'archon-1',
        name: 'Alexios',
        originalName: 'Alexios',
        originalRoot: 'Alex',
        category: 'character',
        cultureId: 'greco_aegean',
        pinned: true,
      };
      useNominaStore.getState().togglePinEntity(entity);

      const savedBible = useNominaStore.getState().saveProjectBible('Aegean Dynasty');
      expect(savedBible.name).toBe('Aegean Dynasty');
      expect(savedBible.pinnedEntityIds).toContain('archon-1');
      expect(savedBible.settings.activeCultureIds).toEqual(['greco_aegean']);
      expect(savedBible.settings.temperature).toBe(0.85);
      expect(savedBible.customVocabulary.honorifics).toEqual(['Strategos', 'Archon']);

      // Reset store to default
      useNominaStore.getState().clearPinned();
      useNominaStore.getState().setActiveCultureIds(['danubian_slavic']);

      // Load saved bible
      useNominaStore.getState().loadProjectBible(savedBible);
      const state = useNominaStore.getState();
      expect(state.activeCultureIds).toEqual(['greco_aegean']);
      expect(state.temperature).toBe(0.85);
      expect(state.markovOrder).toBe(3);
      expect(state.pinnedEntities.length).toBe(1);
      expect(state.pinnedEntities[0].id).toBe('archon-1');
      expect(state.customVocabulary.honorifics).toEqual(['Strategos', 'Archon']);
    });
  });

  describe('clearBatch & clearPinned', () => {
    it('clears batch and pinned entities', () => {
      useNominaStore.getState().setBatchCount(3);
      useNominaStore.getState().generateBatch();
      expect(useNominaStore.getState().generatedBatch.length).toBe(3);

      useNominaStore.getState().clearBatch();
      expect(useNominaStore.getState().generatedBatch.length).toBe(0);

      const entity: LoreEntity = {
        id: 'pinned-test',
        name: 'Test',
        originalName: 'Test',
        originalRoot: 'Test',
        category: 'character',
        cultureId: 'danubian_slavic',
      };
      useNominaStore.getState().togglePinEntity(entity);
      expect(useNominaStore.getState().pinnedEntities.length).toBe(1);

      useNominaStore.getState().clearPinned();
      expect(useNominaStore.getState().pinnedEntities.length).toBe(0);
    });
  });
});
