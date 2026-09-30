import { describe, it, expect } from 'vitest';
import {
  exportToMarkdown,
  exportToJSON,
  exportToCSV,
  exportToProjectBible,
  importFromProjectBible,
} from '../src/utils/export';
import type { LoreEntity, NominaProjectBible } from '../src/types/domain';

describe('Export Utilities', () => {
  const sampleParent: LoreEntity = {
    id: 'parent-1',
    name: 'Boleslav the Brave',
    originalName: 'Boleslav the Brave',
    originalRoot: 'Boleslav',
    rootName: 'Boleslav',
    category: 'character',
    cultureId: 'danubian_slavic',
    subtype: 'Noble',
    description: 'A renowned medieval Slavic warlord and duke.',
    createdAt: 1700000000000,
    children: [
      {
        id: 'child-1',
        name: 'Stanislav Boleslavic',
        originalName: 'Stanislav Boleslavic',
        originalRoot: 'Stanislav',
        rootName: 'Stanislav',
        category: 'character',
        cultureId: 'danubian_slavic',
        subtype: 'Heir',
        parentId: 'parent-1',
        createdAt: 1700000001000,
        children: [
          {
            id: 'grandchild-1',
            name: 'Miroslav Stanislavic',
            originalName: 'Miroslav Stanislavic',
            originalRoot: 'Miroslav',
            rootName: 'Miroslav',
            category: 'character',
            cultureId: 'danubian_slavic',
            subtype: 'Squire',
            parentId: 'child-1',
            createdAt: 1700000002000,
          },
        ],
      },
    ],
  };

  const sampleCity: LoreEntity = {
    id: 'city-1',
    name: 'Belgrad',
    originalName: 'Belgrad',
    originalRoot: 'Bel',
    rootName: 'Belgrad',
    category: 'settlement',
    cultureId: 'danubian_slavic',
    subtype: 'Metropolis',
    createdAt: 1700000003000,
    anglicization: {
      enabled: true,
      mode: 'phonetic',
      anglicizedName: 'Belgrade',
      anglicizedRoot: 'Bel',
      exonymDualDisplay: false,
    },
  };

  const sampleEntities: LoreEntity[] = [sampleParent, sampleCity];

  describe('exportToMarkdown', () => {
    it('generates headers for root and nested child entities', () => {
      const md = exportToMarkdown(sampleEntities);

      expect(md).toContain('# Boleslav the Brave');
      expect(md).toContain('## Stanislav Boleslavic');
      expect(md).toContain('### Miroslav Stanislavic');
      expect(md).toContain('# Belgrad');
    });

    it('includes metadata summary: Culture, Category, Subtype, Original Name', () => {
      const md = exportToMarkdown([sampleParent]);

      expect(md).toMatch(/Culture.*danubian_slavic/i);
      expect(md).toMatch(/Category.*character/i);
      expect(md).toMatch(/Subtype.*Noble/i);
      expect(md).toMatch(/Original Name.*Boleslav the Brave/i);
      expect(md).toContain('A renowned medieval Slavic warlord and duke.');
    });

    it('creates wikilinks for parent lineage by default', () => {
      const md = exportToMarkdown([sampleParent]);

      expect(md).toContain('[[Boleslav the Brave]]');
      expect(md).toContain('[[Stanislav Boleslavic]]');
    });

    it('omits wikilinks when includeWikilinks is false', () => {
      const md = exportToMarkdown([sampleParent], { includeWikilinks: false });

      expect(md).not.toContain('[[Boleslav the Brave]]');
      expect(md).toContain('Part of Boleslav the Brave');
    });

    it('renders nested bullet points or tree indentation for child hierarchy', () => {
      const md = exportToMarkdown([sampleParent]);

      expect(md).toMatch(/- .*Stanislav Boleslavic/);
      expect(md).toMatch(/\s+- .*Miroslav Stanislavic/);
    });

    it('handles empty entity array cleanly', () => {
      const md = exportToMarkdown([]);
      expect(md).toBeDefined();
      expect(typeof md).toBe('string');
    });
  });

  describe('exportToJSON', () => {
    it('exports entities preserving full tree structure', () => {
      const json = exportToJSON(sampleEntities);
      const parsed = JSON.parse(json) as LoreEntity[];

      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('parent-1');
      expect(parsed[0].children?.[0].id).toBe('child-1');
      expect(parsed[0].children?.[0].children?.[0].id).toBe('grandchild-1');
    });

    it('supports pretty indentation flag', () => {
      const prettyJson = exportToJSON(sampleEntities, true);
      const compactJson = exportToJSON(sampleEntities, false);

      expect(prettyJson).toContain('\n');
      expect(compactJson).not.toContain('\n');
    });
  });

  describe('exportToCSV', () => {
    it('generates CSV with exact expected header', () => {
      const csv = exportToCSV(sampleEntities);
      const firstLine = csv.split('\n')[0];

      expect(firstLine).toBe('ID,Name,OriginalName,Category,Subtype,Culture,Root,ParentID,ParentName,Anglicized');
    });

    it('flattens hierarchical entities into separate CSV rows', () => {
      const csv = exportToCSV(sampleEntities);
      const lines = csv.trim().split('\n');

      // 1 header + 3 character lineage rows + 1 city row = 5 rows
      expect(lines.length).toBe(5);

      expect(csv).toContain('parent-1,Boleslav the Brave,Boleslav the Brave,character,Noble,danubian_slavic,Boleslav,,,false');
      expect(csv).toContain('child-1,Stanislav Boleslavic,Stanislav Boleslavic,character,Heir,danubian_slavic,Stanislav,parent-1,Boleslav the Brave,false');
      expect(csv).toContain('grandchild-1,Miroslav Stanislavic,Miroslav Stanislavic,character,Squire,danubian_slavic,Miroslav,child-1,Stanislav Boleslavic,false');
      expect(csv).toContain('city-1,Belgrad,Belgrad,settlement,Metropolis,danubian_slavic,Belgrad,,,true');
    });

    it('escapes fields containing commas, quotes, and newlines', () => {
      const entityWithSpecialChars: LoreEntity = {
        id: 'special-1',
        name: 'John "The Great", Duke of Danubia',
        originalName: 'Ivan "Veliki", Duke\nof Danubia',
        originalRoot: 'Ivan',
        category: 'character',
        cultureId: 'danubian_slavic',
        subtype: 'Duke, Lord',
      };

      const csv = exportToCSV([entityWithSpecialChars]);
      expect(csv).toContain('"John ""The Great"", Duke of Danubia"');
      expect(csv).toContain('"Ivan ""Veliki"", Duke\nof Danubia"');
      expect(csv).toContain('"Duke, Lord"');
    });
  });

  describe('exportToProjectBible & importFromProjectBible', () => {
    const sampleBible: NominaProjectBible = {
      version: '1.0.0',
      name: 'Chronicles of Danubia',
      entities: sampleEntities,
      pinnedEntityIds: ['parent-1'],
      customVocabulary: {
        honorifics: ['Grand Voivode', 'High Ban'],
        customPrefixes: ['Stari-', 'Novo-'],
        customSuffixes: ['-grad', '-polje'],
      },
      settings: {
        activeCultureIds: ['danubian_slavic', 'celtic_gaelic'],
        cultureWeights: { danubian_slavic: 1.0, celtic_gaelic: 0.5 },
        anglicize: true,
        anglicizeMode: 'phonetic',
        exonymDualDisplay: false,
        temperature: 0.75,
        markovOrder: 2,
      },
      savedAt: 1700000050000,
    };

    it('exports and roundtrips project bible cleanly', () => {
      const json = exportToProjectBible(sampleBible);
      expect(typeof json).toBe('string');

      const restored = importFromProjectBible(json);
      expect(restored.version).toBe('1.0.0');
      expect(restored.name).toBe('Chronicles of Danubia');
      expect(restored.entities.length).toBe(2);
      expect(restored.pinnedEntityIds).toEqual(['parent-1']);
      expect(restored.settings.activeCultureIds).toEqual(['danubian_slavic', 'celtic_gaelic']);
      expect(restored.settings.temperature).toBe(0.75);
      expect(restored.customVocabulary.honorifics).toEqual(['Grand Voivode', 'High Ban']);
    });

    it('throws descriptive error on invalid json or missing required fields', () => {
      expect(() => importFromProjectBible('not valid json')).toThrow(/failed to parse/i);
      expect(() => importFromProjectBible('{"name": "test"}')).toThrow(/missing or invalid "version"/i);
      expect(() => importFromProjectBible('{"version": "1.0.0"}')).toThrow(/must be an array/i);
      expect(() => importFromProjectBible('{"version": "1.0.0", "entities": []}')).toThrow(/missing or invalid "settings"/i);
    });

    it('rejects invalid nested entities instead of passing them into the store', () => {
      const json = JSON.stringify({
        ...sampleBible,
        entities: [{ ...sampleParent, children: [{ ...sampleCity, anglicization: { enabled: 'true' } }] }],
      });
      expect(() => importFromProjectBible(json)).toThrow('entities[0].children[0].anglicization.enabled');
    });

    it('uses the shared validator for versions, settings, vocabulary and pinned references', () => {
      for (const [change, path] of [
        [{ version: '9.0.0' }, 'version'],
        [{ settings: { ...sampleBible.settings, anglicize: 'false' } }, 'settings.anglicize'],
        [{ settings: { ...sampleBible.settings, temperature: 10 } }, 'settings.temperature'],
        [{ customVocabulary: { customSeeds: { epithets: [false] } } }, 'customVocabulary.customSeeds.epithets[0]'],
        [{ pinnedEntityIds: ['missing'] }, 'pinnedEntityIds[0]'],
      ] as const) {
        expect(() => importFromProjectBible(JSON.stringify({ ...sampleBible, ...change }))).toThrow(path);
      }
    });

    it('rejects non-finite JSON numeric overflow and unsafe nested property names', () => {
      const overflow = exportToProjectBible(sampleBible).replace('"temperature": 0.75', '"temperature": 1e400');
      expect(() => importFromProjectBible(overflow)).toThrow('settings.temperature');
      const malicious = exportToProjectBible(sampleBible).replace('"rootName": "Boleslav"', '"metadata": {"__proto__": {}}');
      expect(() => importFromProjectBible(malicious)).toThrow('entities[0].metadata.__proto__');
    });
  });
});
