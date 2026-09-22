import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useNominaStore } from '../src/store/useNominaStore';
import { CATEGORIES, CategoryNav } from '../src/components/sidebar/CategoryNav';
import { CultureSelector } from '../src/components/sidebar/CultureSelector';
import { CustomVocabularyModal } from '../src/components/sidebar/CustomVocabularyModal';
import { GeneratorDrawer } from '../src/components/sidebar/GeneratorDrawer';
import { LeftSidebar } from '../src/components/sidebar/LeftSidebar';
import { cultureList, getCultureById } from '../src/data/cultures';
import type { EntityCategory } from '../src/types/domain';

describe('Sidebar Components & Store Integration', () => {
  beforeEach(() => {
    // Reset store to known baseline
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
        },
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [],
      isGenerating: false,
    });
  });

  describe('CategoryNav Component', () => {
    it('defines all 5 domain categories with labels, shortLabels and icons', () => {
      expect(CATEGORIES).toHaveLength(5);
      const categoryIds = CATEGORIES.map((c) => c.id);
      expect(categoryIds).toEqual([
        'character',
        'settlement',
        'geography',
        'faction',
        'artifact',
      ]);

      for (const cat of CATEGORIES) {
        expect(cat.label).toBeTruthy();
        expect(cat.shortLabel).toBeTruthy();
        expect(cat.description).toBeTruthy();
        expect(cat.icon).toBeDefined();
      }
    });

    it('renders CategoryNav and highlights the active category', () => {
      useNominaStore.getState().setActiveCategory('character');
      const html = renderToString(React.createElement(CategoryNav));

      expect(html).toContain('People &amp; Characters');
      expect(html).toContain('Settlements');
      expect(html).toContain('Geography');
      expect(html).toContain('Factions');
      expect(html).toContain('Artifacts');
      // Active badge should be rendered for character
      expect(html).toContain('Active');
      expect(html).toContain('text-gold-400');
    });

    it('switches activeCategory when updated in store', () => {
      const categories: EntityCategory[] = [
        'settlement',
        'geography',
        'faction',
        'artifact',
        'character',
      ];

      for (const cat of categories) {
        useNominaStore.getState().setActiveCategory(cat);
        expect(useNominaStore.getState().activeCategory).toBe(cat);

        const html = renderToString(React.createElement(CategoryNav));
        expect(html).toContain('Active');
      }
    });

    it('renders in collapsed mode without text labels', () => {
      const html = renderToString(React.createElement(CategoryNav, { isCollapsed: true }));
      // In collapsed mode, Domain Categories header is omitted
      expect(html).not.toContain('Domain Categories');
      // SVG icons should still be rendered
      expect(html).toContain('<svg');
    });
  });

  describe('CultureSelector Component', () => {
    it('contains all 5 supported historical cultures', () => {
      expect(cultureList).toHaveLength(5);
      const expectedCultures = [
        'danubian_slavic',
        'celtic_gaelic',
        'nordic_scandian',
        'greco_aegean',
        'levantine_semitic',
      ];

      for (const id of expectedCultures) {
        const culture = getCultureById(id);
        expect(culture).toBeDefined();
        expect(culture?.name).toBeTruthy();
        expect(culture?.region).toBeTruthy();
        expect(culture?.historical_era).toBeTruthy();
        expect(culture?.seeds).toBeDefined();
      }
    });

    it('renders CultureSelector with culture names and mashup toggle', () => {
      const html = renderToString(React.createElement(CultureSelector));

      expect(html).toContain('Origins &amp; Cultures');
      expect(html).toContain('Mashup');
      expect(html).toContain('Danubian Slavic');
      expect(html).toContain('Celtic Gaelic');
      expect(html).toContain('Nordic Scandian');
      expect(html).toContain('Greco Aegean');
      expect(html).toContain('Levantine Semitic');
    });

    it('synchronizes single culture selection with store', () => {
      useNominaStore.getState().setActiveCultureIds(['celtic_gaelic'], { celtic_gaelic: 1.0 });

      const state = useNominaStore.getState();
      expect(state.activeCultureIds).toEqual(['celtic_gaelic']);
      expect(state.cultureWeights).toEqual({ celtic_gaelic: 1.0 });
    });

    it('synchronizes culture mashup with multiple cultures and weights', () => {
      useNominaStore.getState().setActiveCultureIds(
        ['danubian_slavic', 'nordic_scandian', 'greco_aegean'],
        {
          danubian_slavic: 1.5,
          nordic_scandian: 0.8,
          greco_aegean: 0.5,
        }
      );

      const state = useNominaStore.getState();
      expect(state.activeCultureIds).toHaveLength(3);
      expect(state.cultureWeights['danubian_slavic']).toBe(1.5);
      expect(state.cultureWeights['nordic_scandian']).toBe(0.8);
      expect(state.cultureWeights['greco_aegean']).toBe(0.5);

      const html = renderToString(React.createElement(CultureSelector));
      expect(html).toContain('Mashup');
      expect(html).toContain('Weight');
      expect(html).toContain('150%');
      expect(html).toContain('80%');
      expect(html).toContain('50%');
    });

    it('renders collapsed mode for CultureSelector', () => {
      const html = renderToString(React.createElement(CultureSelector, { isCollapsed: true }));
      // Renders initials e.g. DS, CG, NS, GA, LS
      expect(html).toContain('DS');
      expect(html).toContain('CG');
      expect(html).toContain('NS');
      expect(html).toContain('GA');
      expect(html).toContain('LS');
    });
  });

  describe('CustomVocabularyModal & Store Persistence', () => {
    it('synchronizes custom honorific titles with useNominaStore', () => {
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Archon', 'Vojvoda', 'Ser'],
      });

      const vocab = useNominaStore.getState().customVocabulary;
      expect(vocab.honorifics).toEqual(['Archon', 'Vojvoda', 'Ser']);
    });

    it('synchronizes custom prefixes and suffixes with useNominaStore', () => {
      useNominaStore.getState().setCustomVocabulary({
        customPrefixes: ["O'", 'Mac', 'Von'],
        customSuffixes: ['-ford', '-grad', '-stead'],
      });

      const vocab = useNominaStore.getState().customVocabulary;
      expect(vocab.customPrefixes).toEqual(["O'", 'Mac', 'Von']);
      expect(vocab.customSuffixes).toEqual(['-ford', '-grad', '-stead']);
    });

    it('synchronizes custom seed roots with useNominaStore', () => {
      useNominaStore.getState().setCustomVocabulary({
        customSeeds: {
          settlement_roots: ['Valer', 'Drak', 'Khor'],
          given_names_masculine: ['Valer', 'Drak'],
        },
      });

      const vocab = useNominaStore.getState().customVocabulary;
      expect(vocab.customSeeds?.settlement_roots).toEqual(['Valer', 'Drak', 'Khor']);
    });

    it('renders CustomVocabularyModal with sections when open', () => {
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Lady', 'Archon'],
        customPrefixes: ['Von'],
        customSuffixes: ['-grad'],
        customSeeds: { settlement_roots: ['Valeria'] },
      });

      const html = renderToString(
        React.createElement(CustomVocabularyModal, {
          isOpen: true,
          onClose: () => {},
        })
      );

      expect(html).toContain('Custom Vocabulary &amp; Seed Lexicon');
      expect(html).toContain('Custom Honorific Titles');
      expect(html).toContain('Custom Prefixes');
      expect(html).toContain('Custom Suffixes');
      expect(html).toContain('Custom Seed Roots');
      expect(html).toContain('Lady');
      expect(html).toContain('Von');
      expect(html).toContain('-grad');
      expect(html).toContain('Valeria');
    });

    it('does not render modal content when isOpen is false', () => {
      const html = renderToString(
        React.createElement(CustomVocabularyModal, {
          isOpen: false,
          onClose: () => {},
        })
      );

      expect(html).toBe('');
    });

    it('persists custom vocabulary in saveProjectBible and restore in loadProjectBible', () => {
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Ser', 'Archon'],
        customPrefixes: ['Al-'],
        customSuffixes: ['-stead'],
        customSeeds: { settlement_roots: ['Astra'] },
      });

      const bible = useNominaStore.getState().saveProjectBible('Test Bible');
      expect(bible.customVocabulary.honorifics).toEqual(['Ser', 'Archon']);
      expect(bible.customVocabulary.customPrefixes).toEqual(['Al-']);
      expect(bible.customVocabulary.customSuffixes).toEqual(['-stead']);
      expect(bible.customVocabulary.customSeeds?.settlement_roots).toEqual(['Astra']);

      // Clear store
      useNominaStore.getState().setCustomVocabulary({
        honorifics: [],
        customPrefixes: [],
        customSuffixes: [],
        customSeeds: { settlement_roots: [] },
      });
      expect(useNominaStore.getState().customVocabulary.honorifics).toEqual([]);

      // Reload bible
      useNominaStore.getState().loadProjectBible(bible);
      const restored = useNominaStore.getState().customVocabulary;
      expect(restored.honorifics).toEqual(['Ser', 'Archon']);
      expect(restored.customPrefixes).toEqual(['Al-']);
      expect(restored.customSuffixes).toEqual(['-stead']);
      expect(restored.customSeeds?.settlement_roots).toEqual(['Astra']);
    });
  });

  describe('LeftSidebar Container Component', () => {
    it('renders sidebar structure with nav, cultures, custom vocabulary, and generator controls', () => {
      const html = renderToString(React.createElement(LeftSidebar));

      expect(html).toContain('data-testid="left-sidebar"');
      expect(html).toContain('data-testid="sidebar-generate-button"');
      expect(html).toContain('data-testid="sidebar-generator-options-toggle"');
      expect(html).toContain('data-testid="open-custom-vocab-button"');
      expect(html).toContain('People &amp; Characters');
      expect(html).toContain('Origins &amp; Cultures');
      expect(html).toContain('Custom Vocabulary');
      expect(html).toContain('w-80');
      expect(html).not.toContain('Lore &amp; Anthroponymy Engine');
    });

    it('renders in collapsed state with w-16 class and compact generate button', () => {
      const html = renderToString(
        React.createElement(LeftSidebar, { isCollapsed: true })
      );

      expect(html).toContain('w-16');
      expect(html).toContain('data-testid="sidebar-generate-button"');
      expect(html).not.toContain('Lore &amp; Anthroponymy Engine');
    });

    it('displays active custom terms counter in LeftSidebar when vocabulary is configured', () => {
      useNominaStore.getState().setCustomVocabulary({
        honorifics: ['Ser'],
        customPrefixes: ['Von'],
        customSuffixes: ['-grad'],
        customSeeds: { settlement_roots: ['Valer'] },
      });

      const html = renderToString(React.createElement(LeftSidebar));
      expect(html).toContain('4 active');
    });

    it('generates names utilizing the active category, mashup cultures and custom vocabulary', () => {
      useNominaStore.getState().setActiveCategory('settlement');
      useNominaStore.getState().setActiveCultureIds(
        ['danubian_slavic', 'celtic_gaelic'],
        { danubian_slavic: 1.0, celtic_gaelic: 1.0 }
      );
      useNominaStore.getState().setCustomVocabulary({
        customSuffixes: ['-grad'],
        customSeeds: { settlement_roots: ['Staro', 'Novo'] },
      });
      useNominaStore.getState().setBatchCount(5);

      const batch = useNominaStore.getState().generateBatch();
      expect(batch).toHaveLength(5);
      expect(batch[0].category).toBe('settlement');
      expect(batch[0].name.length).toBeGreaterThan(0);
    });
  });

  describe('GeneratorDrawer Component', () => {
    it('renders primary generate button and chevron options toggle button', () => {
      const html = renderToString(React.createElement(GeneratorDrawer));

      expect(html).toContain('data-testid="sidebar-generate-button"');
      expect(html).toContain('Generate');
      expect(html).toContain('⌘⏎');
      expect(html).toContain('data-testid="sidebar-generator-options-toggle"');
    });

    it('renders in compact collapsed mode when isCollapsed is true', () => {
      const html = renderToString(React.createElement(GeneratorDrawer, { isCollapsed: true }));

      expect(html).toContain('data-testid="sidebar-generate-button"');
      expect(html).not.toContain('data-testid="sidebar-generator-options-toggle"');
    });
  });
});
