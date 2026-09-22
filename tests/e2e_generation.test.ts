import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useNominaStore } from '../src/store/useNominaStore';
import { LineageBranchingEngine } from '../src/engines/branching';
import { AnglicizationEngine } from '../src/engines/anglicize';
import {
  exportToMarkdown,
  exportToJSON,
  exportToCSV,
  exportToProjectBible,
  importFromProjectBible,
} from '../src/utils/export';
import { App, handleDesktopShortcuts } from '../src/App';
import type { LoreEntity } from '../src/types/domain';

describe('End-to-End Desktop User Journey & Generation Workflow', () => {
  beforeEach(() => {
    // Reset store to pristine initial baseline before each test
    useNominaStore.setState({
      activeCategory: 'character',
      activeCultureIds: ['celtic_gaelic'],
      cultureWeights: {},
      targetSubtype: 'auto',
      batchCount: 5,
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

  // =========================================================================
  // 1. Setting Custom Vocabulary Overrides
  // =========================================================================
  it('1. Setting custom vocabulary overrides (honorifics, custom seeds, prefixes, suffixes)', () => {
    const store = useNominaStore.getState();

    // Set custom vocabulary overrides
    store.setCustomVocabulary({
      honorifics: ['Grand Inquisitor', 'High Archon', 'Void Warden'],
      customPrefixes: ['Ael-', 'Val-'],
      customSuffixes: ['-glen', '-durn'],
      customSeeds: {
        settlement_roots: ['Caerdun', 'Torval', 'Dunrath'],
        given_names_masculine: ['Eldrin', 'Morrigan', 'Aelric'],
      },
    });

    const stateAfter = useNominaStore.getState();
    expect(stateAfter.customVocabulary.honorifics).toEqual([
      'Grand Inquisitor',
      'High Archon',
      'Void Warden',
    ]);
    expect(stateAfter.customVocabulary.customPrefixes).toEqual(['Ael-', 'Val-']);
    expect(stateAfter.customVocabulary.customSuffixes).toEqual(['-glen', '-durn']);
    expect(stateAfter.customVocabulary.customSeeds?.settlement_roots).toContain('Caerdun');
    expect(stateAfter.customVocabulary.customSeeds?.given_names_masculine).toContain('Eldrin');

    // Generate batch with custom vocabulary active
    store.setActiveCategory('settlement');
    const batch = store.generateBatch();
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.every((e) => e.name && e.name.length > 0)).toBe(true);
  });

  // =========================================================================
  // 2. Multi-Culture Seed Blending / Mashup (Celtic + Nordic)
  // =========================================================================
  it('2. Multi-culture seed blending / mashup (celtic_gaelic + nordic_scandian)', () => {
    const store = useNominaStore.getState();

    // Set dual cultures with custom proportional weights
    store.setActiveCultureIds(['celtic_gaelic', 'nordic_scandian'], {
      celtic_gaelic: 0.6,
      nordic_scandian: 0.4,
    });

    const state = useNominaStore.getState();
    expect(state.activeCultureIds).toEqual(['celtic_gaelic', 'nordic_scandian']);
    expect(state.cultureWeights['celtic_gaelic']).toBe(0.6);
    expect(state.cultureWeights['nordic_scandian']).toBe(0.4);

    // Generate batch of blended names
    store.setBatchCount(10);
    const batch = store.generateBatch();
    expect(batch).toHaveLength(10);

    // Verify all entities have valid culture attribution and valid generated names
    for (const entity of batch) {
      expect(['celtic_gaelic', 'nordic_scandian']).toContain(entity.cultureId);
      expect(entity.name).toBeDefined();
      expect(entity.name.length).toBeGreaterThan(2);
      expect(entity.originalName).toBe(entity.name);
      expect(entity.originalRoot).toBeDefined();
    }
  });

  // =========================================================================
  // 3. Batch Generation Across Categories
  // =========================================================================
  it('3. Batch generation across categories (Characters, Settlements, Geography [4 tiers], Factions, Artifacts)', () => {
    const store = useNominaStore.getState();
    store.setBatchCount(5);

    // 3a. Characters
    store.setActiveCategory('character');
    const characters = store.generateBatch();
    expect(characters).toHaveLength(5);
    expect(characters.every((c) => c.category === 'character')).toBe(true);
    expect(characters[0].name.trim().length).toBeGreaterThan(0);

    // 3b. Settlements
    store.setActiveCategory('settlement');
    const settlements = store.generateBatch();
    expect(settlements).toHaveLength(5);
    expect(settlements.every((s) => s.category === 'settlement')).toBe(true);

    // 3c. Geography across 4 tiers
    store.setActiveCategory('geography');
    const geographyBatch = store.generateBatch();
    expect(geographyBatch).toHaveLength(5);
    expect(geographyBatch.every((g) => g.category === 'geography')).toBe(true);

    // Verify 4-tier geography generation via LineageBranchingEngine
    const branching = new LineageBranchingEngine();
    const macroRegion: LoreEntity = {
      id: 'macro-region-1',
      name: 'The Scandian Expanse',
      originalName: 'The Scandian Expanse',
      originalRoot: 'Scandia',
      category: 'geography',
      cultureId: 'nordic_scandian',
      metadata: { subtype: 'Macro Region', tier: 1 },
      children: [],
      createdAt: Date.now(),
    };

    // Tier 1 -> Tier 2 (Mountain Range, orogeny)
    const tier2 = branching.branchChildren(macroRegion, 'Mountain Range', 1);
    expect(tier2).toHaveLength(1);
    expect(tier2[0].parentId).toBe('macro-region-1');
    expect(tier2[0].featureSubtype).toBe('orogeny');

    // Tier 1 -> Tier 3 (Primary River Basin, hydrology)
    const tier3 = branching.branchChildren(macroRegion, 'Primary River Basin', 1);
    expect(tier3).toHaveLength(1);
    expect(tier3[0].parentId).toBe('macro-region-1');
    expect(tier3[0].featureSubtype).toBe('hydrology');

    // Tier 2 -> Tier 4 (Mountain Pass, orogeny)
    const tier4 = branching.branchChildren(tier2[0], 'Mountain Pass', 1);
    expect(tier4).toHaveLength(1);
    expect(tier4[0].parentId).toBe(tier2[0].id);
    expect(tier4[0].featureSubtype).toBe('orogeny');

    // Tier 3 -> Tier 4 (River Branch, hydrology)
    const riverBranch = branching.branchChildren(tier3[0], 'River Branch / Tributary', 1);
    expect(riverBranch).toHaveLength(1);
    expect(riverBranch[0].parentId).toBe(tier3[0].id);
    expect(riverBranch[0].featureSubtype).toBe('hydrology');

    // 3d. Factions
    store.setActiveCategory('faction');
    const factions = store.generateBatch();
    expect(factions).toHaveLength(5);
    expect(factions.every((f) => f.category === 'faction')).toBe(true);

    // 3e. Artifacts
    store.setActiveCategory('artifact');
    const artifacts = store.generateBatch();
    expect(artifacts).toHaveLength(5);
    expect(artifacts.every((a) => a.category === 'artifact')).toBe(true);
  });

  // =========================================================================
  // 4. Hierarchical Lineage Branching
  // =========================================================================
  it('4. Hierarchical lineage branching (Settlement -> Wards/Gates, Region -> Mountain Pass/Rivers, Faction -> Officers/Relics)', () => {
    const branching = new LineageBranchingEngine();

    // 4a. Settlement -> Wards & Gates
    const settlement: LoreEntity = {
      id: 'settlement-kildare',
      name: 'Kildare Castle',
      originalName: 'Kildare Castle',
      originalRoot: 'Kildare',
      category: 'settlement',
      cultureId: 'celtic_gaelic',
      metadata: { subtype: 'Fortress' },
      children: [],
      createdAt: Date.now(),
    };

    const wards = branching.branchChildren(settlement, 'City Ward', 2);
    const gates = branching.branchChildren(settlement, 'High Gate', 1);

    expect(wards).toHaveLength(2);
    expect(gates).toHaveLength(1);
    expect(settlement.children).toHaveLength(3);
    expect(wards[0].parentId).toBe('settlement-kildare');
    expect(wards[0].name).toContain('Kildare');
    expect(gates[0].name).toContain('Kildare');

    // 4b. Region -> Mountain Pass & Rivers
    const highlands: LoreEntity = {
      id: 'geo-highlands',
      name: 'Gaelic Highlands',
      originalName: 'Gaelic Highlands',
      originalRoot: 'Gael',
      category: 'geography',
      cultureId: 'celtic_gaelic',
      metadata: { subtype: 'Mountain Range', tier: 2 },
      children: [],
      createdAt: Date.now(),
    };

    const passes = branching.branchChildren(highlands, 'Mountain Pass', 1);
    const rivers = branching.branchChildren(highlands, 'River', 1);

    expect(passes).toHaveLength(1);
    expect(rivers).toHaveLength(1);
    expect(passes[0].parentId).toBe('geo-highlands');
    expect(rivers[0].parentId).toBe('geo-highlands');
    expect(passes[0].name).toContain('Gael');
    expect(highlands.children).toHaveLength(2);

    // 4c. Faction -> Officers & Relics
    const faction: LoreEntity = {
      id: 'fac-raven-covenant',
      name: 'The Raven Covenant',
      originalName: 'The Raven Covenant',
      originalRoot: 'Raven',
      category: 'faction',
      cultureId: 'nordic_scandian',
      metadata: { subtype: 'Guild' },
      children: [],
      createdAt: Date.now(),
    };

    const officers = branching.branchChildren(faction, 'Grandmaster', 1);
    const relics = branching.branchChildren(faction, 'Faction Relic', 1);

    expect(officers).toHaveLength(1);
    expect(relics).toHaveLength(1);
    expect(officers[0].parentId).toBe('fac-raven-covenant');
    expect(relics[0].parentId).toBe('fac-raven-covenant');
    expect(faction.children).toHaveLength(2);
  });

  // =========================================================================
  // 5. Lossless Anglicization Overlay Toggle
  // =========================================================================
  it('5. Lossless Anglicization overlay toggle (Phonetic, Suffix, Anglo-Norman) with exonym dual display and 100% loss-free revert', () => {
    const anglicizer = new AnglicizationEngine();

    const entity: LoreEntity = {
      id: 'entity-slavic-1',
      name: 'Szczepan Radovescu',
      originalName: 'Szczepan Radovescu',
      originalRoot: 'Radov',
      category: 'character',
      cultureId: 'danubian_slavic',
      children: [],
      createdAt: Date.now(),
    };

    // 5a. Phonetic mode
    const phoneticOverlay = anglicizer.anglicizeEntity(entity, { mode: 'phonetic' });
    expect(phoneticOverlay.name).not.toBe(entity.originalName);
    expect(phoneticOverlay.name).toContain('Schepan');
    expect(phoneticOverlay.originalName).toBe('Szczepan Radovescu');
    expect(phoneticOverlay.anglicization?.enabled).toBe(true);

    // 5b. Suffix mode
    const suffixOverlay = anglicizer.anglicizeEntity(entity, { mode: 'suffix' });
    expect(suffixOverlay.name).toMatch(/Radov(ey|ton|ford)/);
    expect(suffixOverlay.originalName).toBe('Szczepan Radovescu');

    // 5c. Full Anglo-Norman mode with Dual Exonym Display
    const fullOverlay = anglicizer.anglicizeEntity(entity, {
      mode: 'full',
      exonymDualDisplay: true,
    });
    expect(fullOverlay.anglicization?.exonymDualDisplay).toBe(true);
    const dualDisplay = anglicizer.formatDisplay(fullOverlay);
    expect(dualDisplay).toContain(entity.originalName);

    // 5d. 100% loss-free revert
    const reverted = anglicizer.revert(fullOverlay);
    expect(reverted.name).toBe(entity.originalName);
    expect(reverted.originalName).toBe(entity.originalName);
    expect(reverted.anglicization?.enabled).toBe(false);
  });

  // =========================================================================
  // 6. Pinning to World Bible Collection
  // =========================================================================
  it('6. Pinning to World Bible collection (store.togglePinEntity)', () => {
    const store = useNominaStore.getState();

    const entityToPin: LoreEntity = {
      id: 'bible-item-1',
      name: 'High King Thorstein',
      originalName: 'High King Thorstein',
      originalRoot: 'Thorstein',
      category: 'character',
      cultureId: 'nordic_scandian',
      subtype: 'High King',
      children: [
        {
          id: 'bible-item-child-1',
          name: 'Prince Einar Thorsteinson',
          originalName: 'Prince Einar Thorsteinson',
          originalRoot: 'Thorstein',
          category: 'character',
          cultureId: 'nordic_scandian',
          subtype: 'Heir',
          parentId: 'bible-item-1',
          children: [],
          createdAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
    };

    // Put entity in batch first
    useNominaStore.setState({ generatedBatch: [entityToPin] });

    // Toggle Pin ON
    store.togglePinEntity(entityToPin);
    let state = useNominaStore.getState();
    expect(state.pinnedEntities).toHaveLength(1);
    expect(state.pinnedEntities[0].id).toBe('bible-item-1');
    expect(state.pinnedEntities[0].pinned).toBe(true);
    expect(state.pinnedEntities[0].children).toHaveLength(1);

    // Toggle Pin OFF
    store.togglePinEntity(entityToPin);
    state = useNominaStore.getState();
    expect(state.pinnedEntities).toHaveLength(0);

    // Re-pin for subsequent export tests
    store.togglePinEntity(entityToPin);
    expect(useNominaStore.getState().pinnedEntities).toHaveLength(1);
  });

  // =========================================================================
  // 7. Multi-Format Export Roundtrips
  // =========================================================================
  it('7. Multi-format export roundtrips (Markdown with Obsidian wikilinks, JSON with tree hierarchy, CSV with RFC 4180 escaping, .nomina.json project bible)', () => {
    const pinnedEntities: LoreEntity[] = [
      {
        id: 'city-valk',
        name: 'Valkyria Haven, "The Golden Harbor"',
        originalName: 'Valkyria Haven, "The Golden Harbor"',
        originalRoot: 'Valkyria',
        category: 'settlement',
        cultureId: 'nordic_scandian',
        subtype: 'Port Metropolis',
        description: 'A grand coastal fjord settlement.',
        createdAt: 1700000000000,
        children: [
          {
            id: 'ward-docks',
            name: 'Valkyria Docks Ward',
            originalName: 'Valkyria Docks Ward',
            originalRoot: 'Valkyria',
            category: 'settlement',
            cultureId: 'nordic_scandian',
            subtype: 'City Ward',
            parentId: 'city-valk',
            children: [],
            createdAt: 1700000001000,
          },
        ],
      },
      {
        id: 'blade-frost',
        name: 'Frostfang Blade',
        originalName: 'Frostfang Blade',
        originalRoot: 'Frost',
        category: 'artifact',
        cultureId: 'nordic_scandian',
        subtype: 'Relic Sword',
        children: [],
        createdAt: 1700000002000,
      },
    ];

    // 7a. Markdown with Obsidian wikilinks
    const markdown = exportToMarkdown(pinnedEntities, { includeWikilinks: true });
    expect(markdown).toContain('title: Nomata World Bible Export');
    expect(markdown).toContain('# Valkyria Haven, "The Golden Harbor"');
    expect(markdown).toContain('[[Valkyria Docks Ward]]');
    expect(markdown).toContain('nordic_scandian');

    // 7b. JSON with full hierarchy preservation
    const jsonOutput = exportToJSON(pinnedEntities);
    const parsed = JSON.parse(jsonOutput);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].children).toHaveLength(1);
    expect(parsed[0].children[0].id).toBe('ward-docks');

    // 7c. CSV with RFC 4180 escaping
    const csvOutput = exportToCSV(pinnedEntities);
    expect(csvOutput).toContain('ID,Name,OriginalName,Category,Subtype,Culture,Root,ParentID,ParentName,Anglicized');
    // Escaped quotes and commas: "Valkyria Haven, ""The Golden Harbor"""
    expect(csvOutput).toContain('"Valkyria Haven, ""The Golden Harbor"""');
    expect(csvOutput).toContain('ward-docks');

    // 7d. Project Bible (.nomina.json)
    const bibleState = useNominaStore.getState().saveProjectBible('E2E Project Bible');
    const projectBibleJson = exportToProjectBible(bibleState);
    expect(projectBibleJson).toContain('"version": "1.0.0"');
    expect(projectBibleJson).toContain('"name": "E2E Project Bible"');
  });

  // =========================================================================
  // 8. Project Bible Import & State Reconstruction
  // =========================================================================
  it('8. Project Bible import (importFromProjectBible and store.loadProjectBible) verifying perfect state reconstruction', () => {
    const store = useNominaStore.getState();

    // Prepare rich test universe state
    store.setCustomVocabulary({
      honorifics: ['First Thane'],
      customPrefixes: ['Grim-'],
      customSuffixes: ['-holt'],
      customSeeds: { settlement_roots: ['Grimholt'] },
    });

    store.setActiveCultureIds(['celtic_gaelic', 'nordic_scandian'], {
      celtic_gaelic: 0.7,
      nordic_scandian: 0.3,
    });

    const rootEntity: LoreEntity = {
      id: 'root-empire-1',
      name: 'High Thane Brandr',
      originalName: 'High Thane Brandr',
      originalRoot: 'Brandr',
      category: 'character',
      cultureId: 'nordic_scandian',
      subtype: 'Warlord',
      children: [
        {
          id: 'child-officer-1',
          name: 'Shieldmaiden Astrid Brandrsdottir',
          originalName: 'Shieldmaiden Astrid Brandrsdottir',
          originalRoot: 'Brandr',
          category: 'character',
          cultureId: 'nordic_scandian',
          subtype: 'Lieutenant',
          parentId: 'root-empire-1',
          children: [],
          createdAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
    };

    useNominaStore.setState({ pinnedEntities: [rootEntity] });

    // Export to Project Bible payload
    const projectBible = store.saveProjectBible('Brandr Dynastic Bible');
    const serializedBible = exportToProjectBible(projectBible);

    // Validate import parser
    const deserializedBible = importFromProjectBible(serializedBible);
    expect(deserializedBible.version).toBe('1.0.0');
    expect(deserializedBible.name).toBe('Brandr Dynastic Bible');
    expect(deserializedBible.entities).toHaveLength(1);
    expect(deserializedBible.entities[0].children).toHaveLength(1);

    // Wipe store clean to verify restoration
    useNominaStore.setState({
      pinnedEntities: [],
      activeCultureIds: ['danubian_slavic'],
      cultureWeights: {},
      customVocabulary: {
        honorifics: [],
        customPrefixes: [],
        customSuffixes: [],
        customSeeds: {},
      },
    });

    expect(useNominaStore.getState().pinnedEntities).toHaveLength(0);

    // Load back via store.loadProjectBible
    store.loadProjectBible(deserializedBible);

    const restoredState = useNominaStore.getState();
    expect(restoredState.pinnedEntities).toHaveLength(1);
    expect(restoredState.pinnedEntities[0].id).toBe('root-empire-1');
    expect(restoredState.pinnedEntities[0].name).toBe('High Thane Brandr');
    expect(restoredState.pinnedEntities[0].children?.[0].id).toBe('child-officer-1');
    expect(restoredState.customVocabulary.honorifics).toEqual(['First Thane']);
    expect(restoredState.customVocabulary.customPrefixes).toEqual(['Grim-']);
    expect(restoredState.activeCultureIds).toEqual(['celtic_gaelic', 'nordic_scandian']);
    expect(restoredState.cultureWeights['celtic_gaelic']).toBe(0.7);
  });

  // =========================================================================
  // 9. App Component Integration Rendering & Layout
  // =========================================================================
  it('9. App component integration rendering with header and all 3 panels', () => {
    // Populate some store data for full layout rendering
    useNominaStore.setState({
      activeCategory: 'character',
      activeCultureIds: ['celtic_gaelic', 'nordic_scandian'],
      batchCount: 3,
      generatedBatch: [
        {
          id: 'test-char-1',
          name: 'Cormac of the Fjord',
          originalName: 'Cormac of the Fjord',
          originalRoot: 'Cormac',
          category: 'character',
          cultureId: 'celtic_gaelic',
          children: [],
          createdAt: Date.now(),
        },
      ],
      pinnedEntities: [
        {
          id: 'pinned-test-1',
          name: 'Eldridge Tower',
          originalName: 'Eldridge Tower',
          originalRoot: 'Eldridge',
          category: 'settlement',
          cultureId: 'celtic_gaelic',
          children: [],
          createdAt: Date.now(),
        },
      ],
    });

    const html = renderToString(React.createElement(App));

    // 1. Full Viewport Shell
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toContain('h-screen');
    expect(html).toContain('w-screen');

    // 2. Fixed App Header
    expect(html).toContain('data-testid="app-header"');
    expect(html).toContain('NOMATA');
    expect(html).toContain('data-testid="header-toggle-left-sidebar"');
    expect(html).toContain('data-testid="header-toggle-right-shelf"');
    expect(html).toContain('data-testid="header-export-btn"');

    // 3. Studio 3-Column Body
    expect(html).toContain('data-testid="studio-body"');

    // Left Column: LeftSidebar
    expect(html).toContain('data-testid="left-sidebar"');
    expect(html).toContain('People &amp; Characters');
    expect(html).toContain('Origins &amp; Cultures');
    expect(html).toContain('data-testid="open-custom-vocab-button"');

    // Center Column: CenterStudio
    expect(html).toContain('data-testid="center-studio"');
    expect(html).toContain('data-testid="generator-controls"');
    expect(html).toContain('data-testid="batch-grid-view"');
    expect(html).toContain('Cormac of the Fjord');

    // Right Column: RightShelf
    expect(html).toContain('data-testid="right-shelf"');
    expect(html).toContain('World Bible');
    expect(html).toContain('pinned-count-badge');
    expect(html).toContain('Eldridge Tower');
  });

  // =========================================================================
  // 10. Global Desktop Keyboard Shortcut Event Handlers
  // =========================================================================
  it('10. Global desktop keyboard shortcuts (Cmd+E, Cmd+B, Cmd+J)', () => {
    let leftSidebarToggled = false;
    let rightShelfToggled = false;
    let exportModalToggled = false;

    const actions = {
      toggleLeftSidebar: () => {
        leftSidebarToggled = !leftSidebarToggled;
      },
      toggleRightShelf: () => {
        rightShelfToggled = !rightShelfToggled;
      },
      toggleExportModal: () => {
        exportModalToggled = !exportModalToggled;
      },
    };

    // Trigger Cmd+B (Toggle Sidebar)
    let handled = handleDesktopShortcuts({ key: 'b', metaKey: true }, actions);
    expect(handled).toBe(true);
    expect(leftSidebarToggled).toBe(true);

    // Trigger Cmd+J (Toggle World Bible Right Shelf)
    handled = handleDesktopShortcuts({ key: 'j', metaKey: true }, actions);
    expect(handled).toBe(true);
    expect(rightShelfToggled).toBe(true);

    // Trigger Cmd+E (Open Export Modal)
    handled = handleDesktopShortcuts({ key: 'e', metaKey: true }, actions);
    expect(handled).toBe(true);
    expect(exportModalToggled).toBe(true);

    // Key without Cmd/Ctrl should not trigger
    handled = handleDesktopShortcuts({ key: 'e', metaKey: false, ctrlKey: false }, actions);
    expect(handled).toBe(false);
    expect(exportModalToggled).toBe(true); // Still true, not toggled

    // Key inside input or textarea should not trigger
    const inputMock = { tagName: 'INPUT' } as unknown as EventTarget;
    handled = handleDesktopShortcuts({ key: 'b', metaKey: true, target: inputMock }, actions);
    expect(handled).toBe(false);
    expect(leftSidebarToggled).toBe(true); // Still true, not toggled

    // Key with compound shift modifier should not trigger
    handled = handleDesktopShortcuts({ key: 'e', metaKey: true, shiftKey: true }, actions);
    expect(handled).toBe(false);
  });
});
