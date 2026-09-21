import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useNominaStore } from '../src/store/useNominaStore';
import {
  PinnedItemCard,
  ExportModal,
  RightShelf,
} from '../src/components/shelf';
import { AppHeader } from '../src/components/header';
import type { LoreEntity, NominaProjectBible } from '../src/types/domain';
import {
  exportToMarkdown,
  exportToJSON,
  exportToCSV,
  exportToProjectBible,
} from '../src/utils/export';

describe('Right Shelf & App Header Components', () => {
  const mockEntity1: LoreEntity = {
    id: 'entity-1',
    name: 'Radomir',
    originalName: 'Radomir',
    originalRoot: 'Rad',
    rootName: 'Rad',
    category: 'character',
    cultureId: 'danubian_slavic',
    subtype: 'Warlord',
    meaning: 'Joyful Peace',
    epithet: 'the Vigilant',
    children: [
      {
        id: 'child-1',
        name: 'Radomir II',
        originalName: 'Radomir II',
        originalRoot: 'Rad',
        category: 'character',
        cultureId: 'danubian_slavic',
        subtype: 'Heir',
        parentId: 'entity-1',
        children: [],
      },
    ],
    pinned: true,
    createdAt: Date.now(),
  };

  const mockEntity2: LoreEntity = {
    id: 'entity-2',
    name: 'Oakhaven',
    originalName: 'Dubrava',
    originalRoot: 'Dub',
    rootName: 'Dub',
    category: 'settlement',
    cultureId: 'danubian_slavic',
    subtype: 'Township',
    meaning: 'Oak Grove',
    anglicization: {
      enabled: true,
      mode: 'suffix',
      anglicizedName: 'Oakhaven',
      anglicizedRoot: 'Oak',
      exonymDualDisplay: true,
    },
    children: [],
    pinned: true,
    createdAt: Date.now(),
  };

  const mockEntity3: LoreEntity = {
    id: 'entity-3',
    name: 'Ironcrag Range',
    originalName: 'Zeleznogora',
    originalRoot: 'Zelezno',
    rootName: 'Zelezno',
    category: 'geography',
    cultureId: 'danubian_slavic',
    subtype: 'Mountain Range',
    meaning: 'Iron Mountains',
    children: [],
    pinned: true,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    // Reset Zustand store to known baseline before each test
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
        customSeeds: {},
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [mockEntity1, mockEntity2],
      isGenerating: false,
    });
  });

  /* =======================================================================
   * 1. PinnedItemCard Component
   * ======================================================================= */
  describe('PinnedItemCard Component', () => {
    it('renders entity name, subtype, culture, root, and meaning', () => {
      const html = renderToString(
        React.createElement(PinnedItemCard, { entity: mockEntity1 })
      );

      expect(html).toContain('Radomir');
      expect(html).toContain('Warlord');
      expect(html).toContain('Danubian Slavic');
      expect(html).toContain('root:');
      expect(html).toContain('Rad');
      expect(html).toContain('Joyful Peace');
      expect(html).toContain('the Vigilant');
    });

    it('renders dual display when Anglicization and dual display are active', () => {
      const html = renderToString(
        React.createElement(PinnedItemCard, { entity: mockEntity2 })
      );

      expect(html).toContain('Oakhaven');
      expect(html).toContain('(Dubrava)');
    });

    it('renders children count badge if entity has hierarchical children', () => {
      const html = renderToString(
        React.createElement(PinnedItemCard, { entity: mockEntity1 })
      );

      expect(html).toContain('pinned-item-children');
      expect(html).toContain('1');
    });

    it('triggers inspect tree callback and updates activeEntityId in store', () => {
      const inspectSpy = vi.fn();
      const inspectHtml = renderToString(
        React.createElement(PinnedItemCard, {
          entity: mockEntity1,
          onInspectTree: inspectSpy,
        })
      );
      expect(inspectHtml).toContain('pinned-inspect-btn');

      // Verify store action directly
      useNominaStore.getState().setActiveEntityId(mockEntity1.id);
      expect(useNominaStore.getState().activeEntityId).toBe('entity-1');
    });

    it('triggers unpin callback and removes entity from store', () => {
      const unpinSpy = vi.fn();
      const cardHtml = renderToString(
        React.createElement(PinnedItemCard, {
          entity: mockEntity1,
          onUnpin: unpinSpy,
        })
      );
      expect(cardHtml).toContain('pinned-unpin-btn');

      // Test store action
      useNominaStore.getState().togglePinEntity(mockEntity1);
      const remainingPinned = useNominaStore.getState().pinnedEntities;
      expect(remainingPinned.some((e) => e.id === mockEntity1.id)).toBe(false);
      expect(remainingPinned.length).toBe(1);
    });

    it('supports compact rendering mode', () => {
      const compactHtml = renderToString(
        React.createElement(PinnedItemCard, {
          entity: mockEntity1,
          isCompact: true,
        })
      );
      expect(compactHtml).toContain('p-2.5');
    });
  });

  /* =======================================================================
   * 2. RightShelf Component
   * ======================================================================= */
  describe('RightShelf Component', () => {
    it('renders header with World Bible title and pinned count badge', () => {
      const html = renderToString(React.createElement(RightShelf));

      expect(html).toContain('World Bible');
      expect(html).toContain('pinned-count-badge');
      expect(html).toContain('2');
      expect(html).toContain('Export');
    });

    it('renders empty state when pinnedEntities is empty', () => {
      useNominaStore.setState({ pinnedEntities: [] });

      const html = renderToString(React.createElement(RightShelf));
      expect(html).toContain('Your World Bible is empty');
      expect(html).toContain(
        'Click the pin icon on any generated name in the studio to collect it here.'
      );
    });

    it('renders all pinned entity cards in populated state', () => {
      const html = renderToString(React.createElement(RightShelf));

      expect(html).toContain('Radomir');
      expect(html).toContain('Oakhaven');
    });

    it('renders collapsed view when defaultCollapsed or isCollapsed is true', () => {
      const collapsedHtml = renderToString(
        React.createElement(RightShelf, { isCollapsed: true })
      );

      expect(collapsedHtml).toContain('w-14');
      expect(collapsedHtml).toContain('collapsed-pinned-count');
      expect(collapsedHtml).toContain('collapsed-export-btn');
    });

    it('renders category filter pills (All, People, Settlements, Geography, Factions, Artifacts)', () => {
      const html = renderToString(React.createElement(RightShelf));

      expect(html).toContain('category-filter-all');
      expect(html).toContain('category-filter-character');
      expect(html).toContain('category-filter-settlement');
      expect(html).toContain('category-filter-geography');
      expect(html).toContain('category-filter-faction');
      expect(html).toContain('category-filter-artifact');
    });

    it('handles store clearPinned action', () => {
      expect(useNominaStore.getState().pinnedEntities.length).toBe(2);
      useNominaStore.getState().clearPinned();
      expect(useNominaStore.getState().pinnedEntities.length).toBe(0);
    });
  });

  /* =======================================================================
   * 3. ExportModal Component
   * ======================================================================= */
  describe('ExportModal Component', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        React.createElement(ExportModal, { isOpen: false, onClose: vi.fn() })
      );
      expect(html).toBe('');
    });

    it('renders dialog with format tabs and scope toggle when isOpen is true', () => {
      const html = renderToString(
        React.createElement(ExportModal, { isOpen: true, onClose: vi.fn() })
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('Export Hub &amp; Lore Bible');
      expect(html).toContain('Markdown');
      expect(html).toContain('JSON');
      expect(html).toContain('CSV');
      expect(html).toContain('Nomina Bible');
      expect(html).toContain('scope-pinned');
      expect(html).toContain('scope-all');
      expect(html).toContain('export-preview-pane');
      expect(html).toContain('Download File');
      expect(html).toContain('Copy to Clipboard');
      expect(html).toContain('Import Bible');
    });

    it('formats Markdown output correctly including frontmatter and wikilinks', () => {
      const markdown = exportToMarkdown([mockEntity1, mockEntity2], {
        includeWikilinks: true,
      });

      expect(markdown).toContain('---');
      expect(markdown).toContain('title: Nomina World Bible Export');
      expect(markdown).toContain('# Radomir');
      expect(markdown).toContain('# Oakhaven');
      expect(markdown).toContain('[[Radomir II]]');
    });

    it('formats JSON output with cycle protection and valid structure', () => {
      const json = exportToJSON([mockEntity1, mockEntity2]);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].name).toBe('Radomir');
      expect(parsed[1].name).toBe('Oakhaven');
    });

    it('formats CSV output with standard columns', () => {
      const csv = exportToCSV([mockEntity1, mockEntity2]);
      const lines = csv.trim().split('\n');

      expect(lines[0]).toBe(
        'ID,Name,OriginalName,Category,Subtype,Culture,Root,ParentID,ParentName,Anglicized'
      );
      expect(lines.length).toBeGreaterThan(2); // Header + Radomir + Radomir II + Oakhaven
      expect(csv).toContain('Radomir');
      expect(csv).toContain('Oakhaven');
    });

    it('formats and imports Nomina Project Bible correctly', () => {
      const projectBible: NominaProjectBible = {
        version: '1.0.0',
        name: 'The Shattered Crown',
        entities: [mockEntity1, mockEntity2, mockEntity3],
        pinnedEntityIds: ['entity-1', 'entity-3'],
        customVocabulary: {
          honorifics: ['Ser', 'Lady'],
          customPrefixes: [],
          customSuffixes: [],
        },
        settings: {
          activeCultureIds: ['danubian_slavic'],
          anglicize: true,
          anglicizeMode: 'phonetic',
          exonymDualDisplay: true,
          temperature: 0.8,
          markovOrder: 3,
        },
        savedAt: Date.now(),
      };

      const serialized = exportToProjectBible(projectBible);
      expect(serialized).toContain('"The Shattered Crown"');
      expect(serialized).toContain('"entity-3"');

      // Test store loading
      useNominaStore.getState().loadProjectBible(projectBible);
      const storeState = useNominaStore.getState();

      expect(storeState.pinnedEntities.length).toBe(2);
      expect(storeState.pinnedEntities.map((e) => e.id)).toEqual(['entity-1', 'entity-3']);
      expect(storeState.generatedBatch.length).toBe(1);
      expect(storeState.generatedBatch[0].id).toBe('entity-2');
      expect(storeState.customVocabulary.honorifics).toEqual(['Ser', 'Lady']);
      expect(storeState.anglicize).toBe(true);
      expect(storeState.temperature).toBe(0.8);
      expect(storeState.markovOrder).toBe(3);
    });
  });

  /* =======================================================================
   * 4. AppHeader Component
   * ======================================================================= */
  describe('AppHeader Component', () => {
    it('renders NOMINA title, subtitle, and branding compass', () => {
      const html = renderToString(React.createElement(AppHeader));

      expect(html).toContain('NOMINA');
      expect(html).toContain('Desktop Lore &amp; Name Studio');
      expect(html).toContain('v0.1.0');
    });

    it('renders active category and culture info', () => {
      useNominaStore.setState({
        activeCategory: 'settlement',
        activeCultureIds: ['danubian_slavic'],
      });

      const html = renderToString(React.createElement(AppHeader));

      expect(html).toContain('Settlements &amp; Cities');
      expect(html).toContain('Danubian Slavic');
    });

    it('renders culture blending display when multiple cultures are active', () => {
      useNominaStore.setState({
        activeCultureIds: ['danubian_slavic', 'celtic_gaelic'],
      });

      const html = renderToString(React.createElement(AppHeader));
      expect(html).toContain('Danubian Slavic + Celtic Gaelic');
    });

    it('renders pinned bible count badge and quick export button', () => {
      const html = renderToString(React.createElement(AppHeader));

      expect(html).toContain('header-bible-count');
      expect(html).toContain('2');
      expect(html).toContain('header-export-btn');
      expect(html).toContain('Export');
    });

    it('provides callbacks for drawer toggles and export modal', () => {
      const leftToggleSpy = vi.fn();
      const rightToggleSpy = vi.fn();
      const openExportSpy = vi.fn();

      const html = renderToString(
        React.createElement(AppHeader, {
          leftSidebarCollapsed: false,
          rightShelfCollapsed: true,
          onToggleLeftSidebar: leftToggleSpy,
          onToggleRightShelf: rightToggleSpy,
          onOpenExport: openExportSpy,
        })
      );

      expect(html).toContain('header-toggle-left-sidebar');
      expect(html).toContain('header-toggle-right-shelf');
    });
  });
});
