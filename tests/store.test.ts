import { describe, it, expect, beforeEach } from 'vitest';
import { useNominaStore } from '../src/store/useNominaStore';
import type { LoreEntity } from '../src/types/domain';

describe('useNominaStore', () => {
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
