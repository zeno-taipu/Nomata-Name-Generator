import { describe, expect, it } from 'vitest';
import type { LoreEntity, NominaProjectBible } from '../src/types/domain';
import { AnglicizationEngine } from '../src/engines/anglicize';
import { exportToProjectBible, importFromProjectBible } from '../src/utils/export';
import {
  MAX_PROJECT_ENTITY_DEPTH,
  MAX_PROJECT_ENTITY_NODES,
  validateProjectBible,
} from '../src/utils/projectValidation';

function entity(id = 'root'): LoreEntity {
  return {
    id, name: 'Belgrad', originalName: 'Belgrad', originalRoot: 'Bel',
    category: 'settlement', cultureId: 'danubian_slavic',
  };
}

function bible(): NominaProjectBible {
  return {
    version: '1.0.0', name: 'Nomina World Bible', savedAt: 1700000000000,
    entities: [entity()], pinnedEntityIds: ['root'], customVocabulary: {},
    settings: {
      activeCultureIds: ['danubian_slavic'], anglicize: false,
      anglicizeMode: 'phonetic', exonymDualDisplay: false,
      temperature: 0.7, markovOrder: 2,
    },
  };
}

function nestedWith(fields: Record<string, unknown>): unknown {
  return {
    ...bible(),
    entities: [{ ...entity(), children: [{ ...entity('child'), ...fields }] }],
  };
}

describe('validateProjectBible', () => {
  it('narrows unknown without mutating it, and accepts omitted historical optional fields', () => {
    const input: unknown = bible();
    const before = JSON.stringify(input);
    validateProjectBible(input);
    expect(input.entities[0].name).toBe('Belgrad');
    expect(JSON.stringify(input)).toBe(before);
    expect(input.settings.cultureWeights).toBeUndefined();
    expect(input.entities[0].lastBranchSubtype).toBeUndefined();
  });

  it.each(['Nomina World Bible', 'Nomata World Bible'])('roundtrips %s with every entity field', (name) => {
    const input = bible();
    input.name = name;
    input.entities[0] = {
      ...entity(),
      cultureIds: ['danubian_slavic', 'celtic_gaelic'],
      rootName: 'Bel', originalTitle: 'The Great', parentId: 'earlier-parent',
      subtype: 'Metropolis', lastBranchSubtype: 'District', epithet: 'The Great',
      meaning: 'White city', description: 'Capital', pinned: true, featureSubtype: 'wilds',
      tags: ['historic'], createdAt: 1700000000000,
      anglicization: {
        enabled: true, mode: 'full', anglicizedName: 'Belgrade', anglicizedRoot: 'Bel',
        anglicizedTitle: 'The Great', exonymDualDisplay: true,
        phoneticApproximation: 'bell-grad', notes: 'Optional notes',
      },
      metadata: {
        subtype: 'Metropolis', tier: 1, _originalEpithet: 'The Great',
        extension: { values: [null, true, 1, 'custom'] },
      },
      children: [{ ...entity('child'), parentId: 'root', children: [entity('grandchild')] }],
    };
    input.customVocabulary = {
      honorifics: ['Ser'], customPrefixes: ['Al-'], customSuffixes: ['-grad'],
      customSeeds: {
        given_names_masculine: ['Boris'], given_names_feminine: ['Mira'], surnames: ['Ivanov'],
        settlement_roots: ['Bel'], orogeny_stems: ['Gor'], hydrology_stems: ['Dan'],
        wilds_stems: ['Les'], honorific_titles: ['Duke'], prefixes: ['Novo'],
        suffixes: ['grad'], epithets: ['the Brave'],
      },
    };
    expect(importFromProjectBible(exportToProjectBible(input))).toEqual({
      ...input, settings: { ...input.settings, cultureWeights: {} },
    });
  });

  it('accepts real store saves with separately pinned parent and child snapshots', async () => {
    const { useNominaStore } = await import('../src/store/useNominaStore');
    const previous = useNominaStore.getState();
    try {
      const child: LoreEntity = { ...entity('child'), parentId: 'root' };
      const parent: LoreEntity = { ...entity(), children: [child] };
      useNominaStore.setState({ generatedBatch: [parent], pinnedEntities: [] });
      useNominaStore.getState().togglePinEntity(parent);
      useNominaStore.getState().togglePinEntity(child);
      const saved = useNominaStore.getState().saveProjectBible();
      expect(saved.entities.map((item) => item.id)).toEqual(['root', 'child']);
      expect(saved.entities[0].children?.[0].pinned).toBe(true);
      expect(saved.entities[1].pinned).toBe(true);
      expect(() => validateProjectBible(saved)).not.toThrow();
      expect(importFromProjectBible(exportToProjectBible(saved))).toEqual(saved);
    } finally {
      useNominaStore.setState(previous);
    }
  });

  it('accepts non-ancestor shared references and stale mutable snapshot fields', () => {
    const child = entity('child');
    const input = bible();
    input.entities = [
      { ...entity(), children: [child] }, child,
      { ...child, name: 'Later snapshot', pinned: true, children: [entity('later')] },
    ];
    input.pinnedEntityIds = ['child'];
    expect(() => validateProjectBible(input)).not.toThrow();
  });

  it('roundtrips the overlay baseline for an absent epithet', () => {
    const engine = new AnglicizationEngine();
    const original = entity();
    const input = bible();
    input.entities = [engine.anglicizeEntity(original)];
    expect(input.entities[0].metadata?._originalEpithet).toBeNull();
    expect(input.entities[0].metadata?._originalEpithetPresent).toBe(false);
    const restored = importFromProjectBible(exportToProjectBible(input));
    expect(() => validateProjectBible(restored)).not.toThrow();
    const reverted = engine.revert(restored.entities[0]);
    expect(Object.prototype.hasOwnProperty.call(reverted, 'epithet')).toBe(false);
    expect(reverted.name).toBe(original.name);
  });

  it.each([undefined, null, 'Historical epithet'])('accepts saved epithet baseline %j', (baseline) => {
    expect(() => validateProjectBible(nestedWith({
      metadata: { _originalEpithet: baseline, _originalEpithetPresent: true },
    }))).not.toThrow();
  });

  it.each([
    ['category', 'faction'], ['cultureId', 'celtic_gaelic'], ['parentId', 'other'],
  ])('rejects conflicting stable duplicate identity %s', (field, value) => {
    const input = { ...bible(), entities: [entity(), { ...entity(), [field]: value }] };
    expect(() => validateProjectBible(input)).toThrow(`entities[1].${field}: conflicting identity`);
  });

  it.each(['people', 'settlements', 'factions', 'artifacts', 'character', 'geography'])(
    'accepts supported historical category %s', (category) => {
      expect(() => validateProjectBible(nestedWith({ category }))).not.toThrow();
    },
  );

  it.each([
    ['id', ''], ['name', null], ['originalName', 4], ['originalRoot', {}],
    ['category', 'unknown'], ['cultureId', 'unknown'], ['cultureId', 'toString'],
    ['cultureIds', ['danubian_slavic', 5]], ['cultureIds', ['unknown']],
    ['rootName', []], ['originalTitle', false], ['parentId', 7], ['children', {}],
    ['children', [null]], ['subtype', {}], ['lastBranchSubtype', []],
    ['epithet', 7], ['meaning', false], ['description', {}], ['pinned', 'false'],
    ['featureSubtype', 'mountain'], ['tags', ['ok', 9]], ['createdAt', -1],
    ['createdAt', Infinity], ['anglicization', []], ['metadata', []],
    ['metadata', { subtype: [] }], ['metadata', { _originalEpithet: {} }],
    ['metadata', { _originalEpithetPresent: 'false' }], ['metadata', { _originalEpithetPresent: null }],
    ['metadata', { tier: '2' }], ['metadata', { tier: 2.5 }], ['metadata', { tier: 5 }],
  ])('rejects malformed nested field %s (%j)', (field, value) => {
    expect(() => validateProjectBible(nestedWith({ [field]: value })))
      .toThrow(`entities[0].children[0].${field}`);
  });

  it.each(['id', 'name', 'originalName', 'originalRoot', 'category', 'cultureId'])(
    'rejects missing required nested %s', (field) => {
      expect(() => validateProjectBible(nestedWith({ [field]: undefined })))
        .toThrow(`entities[0].children[0].${field}`);
    },
  );

  it.each([
    ['enabled', 'true'], ['mode', 'invented'], ['anglicizedName', {}],
    ['anglicizedRoot', []], ['anglicizedTitle', 7], ['exonymDualDisplay', 1],
    ['phoneticApproximation', false], ['notes', {}],
  ])('rejects malformed nested overlay %s', (field, value) => {
    const overlay = {
      enabled: true, mode: 'phonetic', anglicizedName: 'Belgrade', anglicizedRoot: 'Bel',
      exonymDualDisplay: false, [field]: value,
    };
    expect(() => validateProjectBible(nestedWith({ anglicization: overlay })))
      .toThrow(`entities[0].children[0].anglicization.${field}`);
  });

  it.each(['enabled', 'mode', 'anglicizedName', 'anglicizedRoot', 'exonymDualDisplay'])(
    'rejects missing required overlay %s', (field) => {
      const overlay = {
        enabled: true, mode: 'phonetic', anglicizedName: 'Belgrade', anglicizedRoot: 'Bel',
        exonymDualDisplay: false, [field]: undefined,
      };
      expect(() => validateProjectBible(nestedWith({ anglicization: overlay })))
        .toThrow(`entities[0].children[0].anglicization.${field}`);
    },
  );

  it.each([
    ['activeCultureIds', 'danubian_slavic'], ['activeCultureIds', ['__proto__']],
    ['activeCultureIds', [false]], ['cultureWeights', []],
    ['cultureWeights', { unknown: 1 }], ['cultureWeights', { danubian_slavic: '1' }],
    ['cultureWeights', { danubian_slavic: 0 }], ['cultureWeights', { danubian_slavic: -1 }],
    ['cultureWeights', { danubian_slavic: 2.1 }], ['cultureWeights', { danubian_slavic: NaN }],
    ['anglicize', 'false'], ['anglicizeMode', 'other'], ['exonymDualDisplay', 1],
    ['temperature', 0], ['temperature', -1], ['temperature', 1.1],
    ['temperature', NaN], ['temperature', Infinity], ['temperature', '0.7'],
    ['markovOrder', 1], ['markovOrder', 4], ['markovOrder', 2.5], ['markovOrder', '2'],
  ])('rejects malformed setting %s (%j)', (field, value) => {
    const input = bible();
    expect(() => validateProjectBible({
      ...input, settings: { ...input.settings, [field]: value },
    })).toThrow(`settings.${field}`);
  });

  it.each(['activeCultureIds', 'anglicize', 'anglicizeMode', 'exonymDualDisplay', 'temperature', 'markovOrder'])(
    'rejects missing required setting %s', (field) => {
      const input = bible();
      expect(() => validateProjectBible({
        ...input, settings: { ...input.settings, [field]: undefined },
      })).toThrow(`settings.${field}`);
    },
  );

  it.each([0.1, 1])('accepts setting boundaries at temperature %s', (temperature) => {
    const input = bible();
    input.settings = {
      ...input.settings, temperature, markovOrder: 3, activeCultureIds: [],
      cultureWeights: { danubian_slavic: 0.1, celtic_gaelic: 2 },
    };
    expect(() => validateProjectBible(input)).not.toThrow();
  });

  it.each(['honorifics', 'customPrefixes', 'customSuffixes'])('validates vocabulary %s', (field) => {
    expect(() => validateProjectBible({
      ...bible(), customVocabulary: { [field]: ['valid', {}] },
    })).toThrow(`customVocabulary.${field}[1]`);
  });

  it.each([
    'given_names_masculine', 'given_names_feminine', 'surnames', 'settlement_roots',
    'orogeny_stems', 'hydrology_stems', 'wilds_stems', 'honorific_titles',
    'prefixes', 'suffixes', 'epithets',
  ])('validates seed list %s', (field) => {
    expect(() => validateProjectBible({
      ...bible(), customVocabulary: { customSeeds: { [field]: [42] } },
    })).toThrow(`customVocabulary.customSeeds.${field}[0]`);
  });

  it.each([null, [], false, 4, 'project'])('rejects invalid roots (%j)', (value) => {
    expect(() => validateProjectBible(value)).toThrow('root');
  });

  it.each(['2.0.0', '1.0', '0.9.0', '', null, 1])('rejects unsupported/invalid version %j', (version) => {
    expect(() => validateProjectBible({ ...bible(), version })).toThrow('version');
  });

  it.each([
    ['name', {}], ['savedAt', 'today'], ['savedAt', NaN], ['savedAt', -1],
    ['entities', {}], ['settings', []], ['customVocabulary', []],
    ['customVocabulary', { customSeeds: [] }],
    ['pinnedEntityIds', {}], ['pinnedEntityIds', [5]], ['pinnedEntityIds', ['missing']],
  ])('rejects invalid document field %s', (field, value) => {
    expect(() => validateProjectBible({ ...bible(), [field]: value })).toThrow(field);
  });

  it.each(['version', 'name', 'savedAt', 'entities', 'settings', 'customVocabulary', 'pinnedEntityIds'])(
    'rejects missing required %s', (field) => {
      expect(() => validateProjectBible({ ...bible(), [field]: undefined })).toThrow(field);
    },
  );

  it('resolves pinned IDs against recursive identities', () => {
    const input = bible();
    input.entities[0].children = [entity('child')];
    input.pinnedEntityIds = ['child'];
    expect(() => validateProjectBible(input)).not.toThrow();
  });

  it('rejects direct object cycles and same-ID ancestor cycles', () => {
    const input = bible();
    input.entities[0].children = [input.entities[0]];
    expect(() => validateProjectBible(input)).toThrow(/entities\[0\].children\[0\].*ancestor cycle/);
    input.entities[0].children = [entity()];
    expect(() => validateProjectBible(input)).toThrow(/children\[0\].id.*ancestor identity cycle/);
  });

  it('rejects cycles in arbitrary extension metadata', () => {
    const metadata: Record<string, unknown> = {};
    metadata.loop = metadata;
    expect(() => validateProjectBible(nestedWith({ metadata }))).toThrow(/metadata.loop.*ancestor cycle/);
  });

  it('rejects unsafe keys, non-data properties and non-JSON extension values', () => {
    const malicious: unknown = JSON.parse('{"__proto__": {"polluted": true}}');
    expect(() => validateProjectBible(nestedWith({ metadata: malicious }))).toThrow(/metadata.__proto__/);
    let accessed = false;
    const metadata = Object.defineProperty({}, 'subtype', { get() { accessed = true; return 'City'; } });
    expect(() => validateProjectBible(nestedWith({ metadata }))).toThrow(/metadata.subtype.*accessor/);
    expect(accessed).toBe(false);
    expect(() => validateProjectBible(nestedWith({ metadata: { fn: () => 'bad' } }))).toThrow(/metadata.fn/);
    expect(() => validateProjectBible(nestedWith({ metadata: new Date() }))).toThrow(/metadata.*plain object/);
  });

  it('rejects sparse typed arrays rather than skipping their holes', () => {
    expect(() => validateProjectBible(nestedWith({ tags: new Array(2) }))).toThrow(/tags\[0\]/);
  });

  it('bounds entity depth without overflowing the call stack', () => {
    const input = bible();
    let leaf = input.entities[0];
    for (let i = 1; i < MAX_PROJECT_ENTITY_DEPTH; i++) {
      const child = entity(`depth-${i}`);
      leaf.children = [child];
      leaf = child;
    }
    expect(() => validateProjectBible(input)).not.toThrow();
    leaf.children = [entity('too-deep')];
    expect(() => validateProjectBible(input)).toThrow(/entity depth limit/);
  });

  it('counts duplicate occurrences toward the entity node bound', () => {
    const input = bible();
    input.entities = Array.from({ length: MAX_PROJECT_ENTITY_NODES }, () => entity());
    expect(() => validateProjectBible(input)).not.toThrow();
    input.entities.push(entity());
    expect(() => validateProjectBible(input)).toThrow(/entity node limit/);
  });

  it('bounds metadata depth and vocabulary size', () => {
    let metadata: Record<string, unknown> = {};
    for (let i = 0; i < 260; i++) metadata = { next: metadata };
    expect(() => validateProjectBible(nestedWith({ metadata }))).toThrow(/data depth limit/);
    const input = bible();
    input.customVocabulary.honorifics = new Array(250_001);
    expect(() => validateProjectBible(input)).toThrow(/value limit/);
  });
});
