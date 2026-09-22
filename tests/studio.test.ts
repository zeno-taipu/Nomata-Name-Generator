import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useNominaStore } from '../src/store/useNominaStore';
import {
  GeneratorControls,
  EntityNodeCard,
  BatchGridView,
  LineageTreeView,
  CenterStudio,
} from '../src/components/studio';
import type { LoreEntity } from '../src/types/domain';

describe('Center Studio Components & Interactive Lineage Tree', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNominaStore.setState({
      activeCategory: 'settlement',
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
        customSeeds: {},
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [],
      isGenerating: false,
    });
  });

  describe('GeneratorControls Component', () => {
    it('renders generate button, batch pills, temperature slider, Markov order, and Anglicization toggles', () => {
      const html = renderToString(React.createElement(GeneratorControls));

      expect(html).toContain('Generate');
      expect(html).toContain('⌘⏎');
      expect(html).toContain('Batch:');
      expect(html).toContain('Temp:');
      expect(html).toContain('0.70');
      expect(html).toContain('Order 2');
      expect(html).toContain('Order 3');
      expect(html).toContain('Anglicize');
      expect(html).toContain('Phonetic');
      expect(html).toContain('Suffix');
      expect(html).toContain('Archaic');
      expect(html).toContain('Dual');
      expect(html).toContain('Grid');
      expect(html).toContain('Tree');
    });

    it('synchronizes batch count pill selection with store', () => {
      expect(useNominaStore.getState().batchCount).toBe(10);

      useNominaStore.getState().setBatchCount(25);
      expect(useNominaStore.getState().batchCount).toBe(25);

      const html = renderToString(React.createElement(GeneratorControls));
      // 25 should have active gold styling
      expect(html).toContain('bg-gold-500/20 text-gold-400');
    });

    it('synchronizes temperature slider and Markov order with store', () => {
      useNominaStore.getState().setEngineConfig({ temperature: 0.85, markovOrder: 3 });

      expect(useNominaStore.getState().temperature).toBe(0.85);
      expect(useNominaStore.getState().markovOrder).toBe(3);

      const html = renderToString(React.createElement(GeneratorControls));
      expect(html).toContain('0.85');
    });

    it('synchronizes Anglicization toggles, modes, and dual display with store', () => {
      useNominaStore.getState().setAnglicizationConfig({
        anglicize: true,
        anglicizeMode: 'suffix',
        exonymDualDisplay: true,
      });

      const state = useNominaStore.getState();
      expect(state.anglicize).toBe(true);
      expect(state.anglicizeMode).toBe('suffix');
      expect(state.exonymDualDisplay).toBe(true);

      const html = renderToString(React.createElement(GeneratorControls));
      expect(html).toContain('animate-pulse');
    });

    it('displays loading spinner and disabled state when isGenerating is true', () => {
      useNominaStore.setState({ isGenerating: true });

      const html = renderToString(React.createElement(GeneratorControls));
      expect(html).toContain('Generating...');
      expect(html).toContain('cursor-not-allowed');
    });

    it('renders view mode switcher with active tree or grid state', () => {
      const gridHtml = renderToString(
        React.createElement(GeneratorControls, { viewMode: 'grid' })
      );
      expect(gridHtml).toContain('Grid');

      const treeHtml = renderToString(
        React.createElement(GeneratorControls, { viewMode: 'tree' })
      );
      expect(treeHtml).toContain('Tree');
    });
  });

  describe('EntityNodeCard Component', () => {
    const mockEntity: LoreEntity = {
      id: 'test-entity-1',
      name: 'Novigrad',
      originalName: 'Novigrad',
      originalRoot: 'Novi',
      rootName: 'Novi',
      category: 'settlement',
      cultureId: 'danubian_slavic',
      subtype: 'Metropolis',
      meaning: 'New City / Stronghold',
      children: [],
      pinned: false,
      createdAt: Date.now(),
    };

    it('renders entity name, subtype, culture, root, and meaning', () => {
      const html = renderToString(
        React.createElement(EntityNodeCard, { entity: mockEntity })
      );

      expect(html).toContain('Novigrad');
      expect(html).toContain('Metropolis');
      expect(html).toContain('Danubian Slavic');
      expect(html).toContain('root: Novi');
      expect(html).toContain('New City / Stronghold');
      expect(html).toContain('+ Branch');
      expect(html).toContain('data-testid="branch-repeat-button"');
    });

    it('renders dual display when Anglicization and dual display are active', () => {
      const anglicizedEntity: LoreEntity = {
        ...mockEntity,
        name: 'Newburgh',
        originalName: 'Novigrad',
        anglicization: {
          enabled: true,
          mode: 'suffix',
          anglicizedName: 'Newburgh',
          anglicizedRoot: 'New',
          exonymDualDisplay: true,
          phoneticApproximation: 'Noh-vee-grahd',
        },
      };

      const html = renderToString(
        React.createElement(EntityNodeCard, { entity: anglicizedEntity })
      );

      expect(html).toContain('Newburgh');
      expect(html).toContain('(Novigrad)');
      expect(html).toContain('[Noh-vee-grahd]');
    });

    it('renders pinned indicator correctly when entity is pinned or unpinned', () => {
      const unpinnedHtml = renderToString(
        React.createElement(EntityNodeCard, { entity: mockEntity })
      );
      expect(unpinnedHtml).toContain('Pin to World Bible');

      const pinnedEntity = { ...mockEntity, pinned: true };
      const pinnedHtml = renderToString(
        React.createElement(EntityNodeCard, { entity: pinnedEntity })
      );
      expect(pinnedHtml).toContain('Unpin from World Bible');
      expect(pinnedHtml).toContain('fill-amber-400');
    });

    it('renders children count badge if entity has hierarchical children', () => {
      const parentEntity: LoreEntity = {
        ...mockEntity,
        children: [
          {
            id: 'child-1',
            name: 'Novigrad Old Ward',
            originalName: 'Novigrad Old Ward',
            originalRoot: 'Novi',
            category: 'settlement',
            cultureId: 'danubian_slavic',
            subtype: 'City Ward',
            parentId: mockEntity.id,
            children: [],
          },
        ],
      };

      const html = renderToString(
        React.createElement(EntityNodeCard, { entity: parentEntity })
      );

      expect(html).toContain('entity-children-badge');
      expect(html).toContain('1');
    });

    it('executes store actions: pin, re-roll, branch, and toggle Anglicize', () => {
      useNominaStore.setState({ generatedBatch: [mockEntity] });

      // Test pin
      useNominaStore.getState().togglePinEntity(mockEntity);
      expect(useNominaStore.getState().pinnedEntities.length).toBe(1);
      expect(useNominaStore.getState().pinnedEntities[0].id).toBe(mockEntity.id);

      // Test unpin
      useNominaStore.getState().togglePinEntity(mockEntity);
      expect(useNominaStore.getState().pinnedEntities.length).toBe(0);

      // Test branch
      const branched = useNominaStore.getState().branchEntity(mockEntity.id, 'City Ward', 1);
      expect(branched.length).toBe(1);
      expect(branched[0].parentId).toBe(mockEntity.id);
      expect(useNominaStore.getState().generatedBatch[0].children?.length).toBe(1);

      // Test re-roll
      const rerolled = useNominaStore.getState().reRollEntity(mockEntity.id);
      expect(rerolled).toBeDefined();
      expect(rerolled?.id).toBe(mockEntity.id);

      // Test toggle Anglicize
      const anglicized = useNominaStore.getState().toggleAnglicizeEntity(mockEntity.id);
      expect(anglicized).toBeDefined();
      expect(anglicized?.anglicization?.enabled).toBe(true);

      // Revert Anglicize
      const reverted = useNominaStore.getState().toggleAnglicizeEntity(mockEntity.id);
      expect(reverted?.anglicization?.enabled).toBe(false);
    });
  });

  describe('BatchGridView Component', () => {
    it('renders friendly empty state with Call-To-Action when batch is empty', () => {
      useNominaStore.setState({ generatedBatch: [] });

      const html = renderToString(React.createElement(BatchGridView));

      expect(html).toContain('empty-batch-state');
      expect(html).toContain('No Entities in Active Batch');
      expect(html).toContain('Generate First Batch');
    });

    it('renders entity cards and batch header when batch has entities', () => {
      const sampleBatch: LoreEntity[] = [
        {
          id: 'ent-1',
          name: 'Bratislava',
          originalName: 'Bratislava',
          originalRoot: 'Brat',
          category: 'settlement',
          cultureId: 'danubian_slavic',
          subtype: 'Fortress',
          children: [],
        },
        {
          id: 'ent-2',
          name: 'Belograd',
          originalName: 'Belograd',
          originalRoot: 'Belo',
          category: 'settlement',
          cultureId: 'danubian_slavic',
          subtype: 'Haven',
          children: [],
        },
      ];

      useNominaStore.setState({ generatedBatch: sampleBatch });

      const html = renderToString(React.createElement(BatchGridView));

      expect(html).toContain('Generated Entities');
      expect(html).toContain('2');
      expect(html).toContain('Bratislava');
      expect(html).toContain('Belograd');
      expect(html).toContain('Pin All');
      expect(html).toContain('Re-roll All');
      expect(html).toContain('Clear');
    });

    it('clears batch when clearBatch action is invoked', () => {
      useNominaStore.setState({
        generatedBatch: [
          {
            id: 'ent-1',
            name: 'Krakov',
            originalName: 'Krakov',
            originalRoot: 'Krak',
            category: 'settlement',
            cultureId: 'danubian_slavic',
            children: [],
          },
        ],
      });

      expect(useNominaStore.getState().generatedBatch.length).toBe(1);
      useNominaStore.getState().clearBatch();
      expect(useNominaStore.getState().generatedBatch.length).toBe(0);
    });

    it('pins all batch entities when Pin All is executed', () => {
      const sampleBatch: LoreEntity[] = [
        {
          id: 'ent-1',
          name: 'Entity 1',
          originalName: 'Entity 1',
          originalRoot: 'Ent1',
          category: 'settlement',
          cultureId: 'danubian_slavic',
          children: [],
          pinned: false,
        },
        {
          id: 'ent-2',
          name: 'Entity 2',
          originalName: 'Entity 2',
          originalRoot: 'Ent2',
          category: 'settlement',
          cultureId: 'danubian_slavic',
          children: [],
          pinned: false,
        },
      ];

      useNominaStore.setState({ generatedBatch: sampleBatch, pinnedEntities: [] });

      sampleBatch.forEach((e) => useNominaStore.getState().togglePinEntity(e));

      expect(useNominaStore.getState().pinnedEntities.length).toBe(2);
      expect(useNominaStore.getState().generatedBatch.every((e) => e.pinned)).toBe(true);
    });
  });

  describe('LineageTreeView Component', () => {
    it('renders empty lineage state when no entities exist', () => {
      useNominaStore.setState({ generatedBatch: [], pinnedEntities: [] });

      const html = renderToString(React.createElement(LineageTreeView));

      expect(html).toContain('No Lineage Hierarchies Available');
      expect(html).toContain('Interactive Lineage Tree');
    });

    it('renders multi-tier hierarchy with parent and nested children', () => {
      const hierarchicalEntity: LoreEntity = {
        id: 'parent-root',
        name: 'Vyshegrad',
        originalName: 'Vyshegrad',
        originalRoot: 'Vyshe',
        category: 'settlement',
        cultureId: 'danubian_slavic',
        subtype: 'Metropolis',
        children: [
          {
            id: 'child-ward',
            parentId: 'parent-root',
            name: 'Vyshegrad Citadel Ward',
            originalName: 'Vyshegrad Citadel Ward',
            originalRoot: 'Vyshe',
            category: 'settlement',
            cultureId: 'danubian_slavic',
            subtype: 'City Ward',
            children: [
              {
                id: 'grandchild-gate',
                parentId: 'child-ward',
                name: 'High Iron Gate',
                originalName: 'High Iron Gate',
                originalRoot: 'Vyshe',
                category: 'settlement',
                cultureId: 'danubian_slavic',
                subtype: 'High Gate',
                children: [],
              },
            ],
          },
        ],
      };

      useNominaStore.setState({
        generatedBatch: [hierarchicalEntity],
        activeEntityId: null,
      });

      const html = renderToString(React.createElement(LineageTreeView));

      // Root entity
      expect(html).toContain('Vyshegrad');
      expect(html).toContain('Tier 1 (Root)');

      // Child entity
      expect(html).toContain('Vyshegrad Citadel Ward');
      expect(html).toContain('Tier 2 (Subordinate)');

      // Grandchild entity
      expect(html).toContain('High Iron Gate');
      expect(html).toContain('Tier 3 (Subdivision)');

      // Hierarchy visual connector line classes
      expect(html).toContain('border-l-2 border-gold-500/30');
      expect(html).not.toContain('+ Add Subordinate Subdivision');
    });

    it('renders breadcrumb navigation when activeEntityId is set', () => {
      const parent: LoreEntity = {
        id: 'parent-1',
        name: 'Parent Realm',
        originalName: 'Parent Realm',
        originalRoot: 'Parent',
        category: 'settlement',
        cultureId: 'danubian_slavic',
        children: [
          {
            id: 'child-1',
            parentId: 'parent-1',
            name: 'Child Outpost',
            originalName: 'Child Outpost',
            originalRoot: 'Child',
            category: 'settlement',
            cultureId: 'danubian_slavic',
            children: [],
          },
        ],
      };

      useNominaStore.setState({
        generatedBatch: [parent],
        activeEntityId: 'child-1',
      });

      const html = renderToString(React.createElement(LineageTreeView));

      expect(html).toContain('tree-breadcrumbs');
      expect(html).toContain('All Trees');
      expect(html).toContain('Parent Realm');
      expect(html).toContain('Child Outpost');
    });
  });

  describe('CenterStudio Container Component', () => {
    it('renders toolbar, viewport, and floating bottom stats bar', () => {
      useNominaStore.setState({
        batchCount: 5,
        activeCategory: 'character',
        activeCultureIds: ['danubian_slavic'],
        temperature: 0.65,
        markovOrder: 2,
        anglicize: false,
        generatedBatch: [
          {
            id: 'c-1',
            name: 'Branimir',
            originalName: 'Branimir',
            originalRoot: 'Bran',
            category: 'character',
            cultureId: 'danubian_slavic',
            subtype: 'Voivode',
            children: [],
          },
        ],
        pinnedEntities: [],
      });

      const html = renderToString(React.createElement(CenterStudio));

      // Header GeneratorControls
      expect(html).toContain('generator-controls');
      expect(html).toContain('Generate');

      // Grid Viewport
      expect(html).toContain('batch-grid-view');
      expect(html).toContain('Branimir');

      // Floating Stats Bar
      expect(html).toContain('studio-stats-bar');
      expect(html).toContain('Batch:');
      expect(html).toContain('Bible Pinned:');
      expect(html).toContain('T:0.65');
      expect(html).toContain('Ord:2');
      expect(html).toContain('EN:OFF');
    });

    it('switches seamlessly between BatchGridView and LineageTreeView', () => {
      const gridHtml = renderToString(
        React.createElement(CenterStudio, { defaultViewMode: 'grid' })
      );
      expect(gridHtml).toContain('batch-grid-view');
      expect(gridHtml).not.toContain('lineage-tree-view');

      const treeHtml = renderToString(
        React.createElement(CenterStudio, { defaultViewMode: 'tree' })
      );
      expect(treeHtml).toContain('lineage-tree-view');
      expect(treeHtml).not.toContain('batch-grid-view');
    });
  });
});
