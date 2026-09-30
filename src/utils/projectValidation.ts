import { getCultureIds } from '../data/cultures';
import { normalizeEntityCategory } from '../types/domain';
import type { NominaProjectBible } from '../types/domain';

export const MAX_PROJECT_ENTITY_DEPTH = 64;
export const MAX_PROJECT_ENTITY_NODES = 10_000;
// Also bound extension metadata and vocabulary, not just entity children.
const MAX_VALUE_DEPTH = 256;
const MAX_VALUES = 250_000;
const cultureIds = new Set(getCultureIds());
const categories = [
  'character', 'settlement', 'geography', 'faction', 'artifact',
  'people', 'settlements', 'factions', 'artifacts',
];
const modes = ['phonetic', 'suffix', 'full'];
const seedFields = [
  'given_names_masculine', 'given_names_feminine', 'surnames', 'settlement_roots',
  'orogeny_stems', 'hydrology_stems', 'wilds_stems', 'honorific_titles',
  'prefixes', 'suffixes', 'epithets',
];

function invalid(path: string, reason: string): never {
  throw new Error(`Invalid project bible: ${path}: ${reason}`);
}

function record(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(path, 'must be an object');
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalid(path, 'must be a plain object');
  }
}

function array(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) invalid(path, 'must be an array');
}

function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string') invalid(path, 'must be a string');
}

function identity(value: unknown, path: string): asserts value is string {
  string(value, path);
  if (!value.trim()) invalid(path, 'must be a non-empty identifier');
}

function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') invalid(path, 'must be a boolean');
}

function number(value: unknown, path: string, min: number, max: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    invalid(path, `must be a finite number between ${min} and ${max}`);
  }
}

function oneOf(value: unknown, path: string, choices: readonly string[]): asserts value is string {
  if (typeof value !== 'string' || !choices.includes(value)) {
    invalid(path, `must be one of ${choices.join(', ')}`);
  }
}

function stringList(value: unknown, path: string): asserts value is string[] {
  array(value, path);
  for (let i = 0; i < value.length; i++) string(value[i], `${path}[${i}]`);
}

function culture(value: unknown, path: string): asserts value is string {
  string(value, path);
  if (!cultureIds.has(value)) invalid(path, `unknown culture ID "${value}"`);
}

function cultureList(value: unknown, path: string): void {
  array(value, path);
  for (let i = 0; i < value.length; i++) culture(value[i], `${path}[${i}]`);
}

function optionalStrings(value: Record<string, unknown>, path: string, fields: string[]): void {
  for (const field of fields) {
    if (value[field] !== undefined) string(value[field], `${path}.${field}`);
  }
}

/**
 * Accept only bounded, JSON-compatible data (plus undefined optional properties
 * produced by saveProjectBible). Inspect descriptors before reading properties so
 * direct API callers cannot smuggle accessors or cyclic extension metadata through.
 * Shared objects are fine; only objects on the current ancestor path are cycles.
 */
function validateDataGraph(root: unknown): void {
  const ancestors = new Set<object>();
  let count = 0;
  function visit(value: unknown, path: string, depth: number): void {
    if (++count > MAX_VALUES) invalid(path, `exceeds the ${MAX_VALUES} value limit`);
    if (depth > MAX_VALUE_DEPTH) invalid(path, `exceeds the ${MAX_VALUE_DEPTH} data depth limit`);
    if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) invalid(path, 'must be a finite number');
      return;
    }
    if (typeof value !== 'object') invalid(path, 'must be JSON-compatible data');
    if (ancestors.has(value)) invalid(path, 'ancestor cycle detected');
    if (!Array.isArray(value)) record(value, path);
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') invalid(path, 'symbol properties are not supported');
      if (Array.isArray(value) && key === 'length') {
        if (value.length > MAX_VALUES) invalid(path, `exceeds the ${MAX_VALUES} value limit`);
        continue;
      }
      const childPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        invalid(childPath, 'unsafe property name');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) invalid(childPath, 'accessor properties are not supported');
      const child: unknown = descriptor.value;
      visit(child, childPath, depth + 1);
    }
    ancestors.delete(value);
  }
  visit(root, 'project', 0);
}

function validateOverlay(value: unknown, path: string): void {
  record(value, path);
  boolean(value.enabled, `${path}.enabled`);
  oneOf(value.mode, `${path}.mode`, modes);
  string(value.anglicizedName, `${path}.anglicizedName`);
  string(value.anglicizedRoot, `${path}.anglicizedRoot`);
  boolean(value.exonymDualDisplay, `${path}.exonymDualDisplay`);
  optionalStrings(value, path, ['anglicizedTitle', 'phoneticApproximation', 'notes']);
}

function validateSettings(value: unknown): void {
  const path = 'settings';
  record(value, path);
  // Empty selections have historically been supported (the store uses its default culture).
  cultureList(value.activeCultureIds, `${path}.activeCultureIds`);
  if (value.cultureWeights !== undefined) {
    record(value.cultureWeights, `${path}.cultureWeights`);
    for (const [key, weight] of Object.entries(value.cultureWeights)) {
      culture(key, `${path}.cultureWeights.${key}`);
      number(weight, `${path}.cultureWeights.${key}`, 0.1, 2);
    }
  }
  boolean(value.anglicize, `${path}.anglicize`);
  oneOf(value.anglicizeMode, `${path}.anglicizeMode`, modes);
  boolean(value.exonymDualDisplay, `${path}.exonymDualDisplay`);
  number(value.temperature, `${path}.temperature`, 0.1, 1);
  if (value.markovOrder !== 2 && value.markovOrder !== 3) {
    invalid(`${path}.markovOrder`, 'must be 2 or 3');
  }
}

function validateVocabulary(value: unknown): void {
  const path = 'customVocabulary';
  record(value, path);
  for (const field of ['honorifics', 'customPrefixes', 'customSuffixes']) {
    if (value[field] !== undefined) stringList(value[field], `${path}.${field}`);
  }
  if (value.customSeeds !== undefined) {
    record(value.customSeeds, `${path}.customSeeds`);
    for (const field of seedFields) {
      if (value.customSeeds[field] !== undefined) {
        stringList(value.customSeeds[field], `${path}.customSeeds.${field}`);
      }
    }
  }
}

/**
 * Shared, non-mutating runtime boundary for .nomina.json and .nomata.json v1.0.0.
 * Missing optional fields remain valid; malformed present fields are never coerced.
 * Call before any store mutation. Throws Error with the offending field path.
 */
export function validateProjectBible(value: unknown): asserts value is NominaProjectBible {
  validateDataGraph(value);
  record(value, 'root');
  if (typeof value.version !== 'string' || !value.version) {
    invalid('version', 'missing or invalid "version"');
  }
  if (value.version !== '1.0.0') invalid('version', `unsupported version "${value.version}"; supported version is 1.0.0`);
  array(value.entities, 'entities');
  if (value.settings === undefined || value.settings === null || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
    invalid('settings', 'missing or invalid "settings": must be an object');
  }
  validateSettings(value.settings);
  string(value.name, 'name');
  number(value.savedAt, 'savedAt', 0, Number.MAX_SAFE_INTEGER);
  validateVocabulary(value.customVocabulary);
  stringList(value.pinnedEntityIds, 'pinnedEntityIds');

  const identities = new Map<string, { category: string; cultureId: string; parentId: unknown; path: string }>();
  const ancestors = new Set<string>();
  let nodes = 0;
  function entity(value: unknown, path: string, depth: number): void {
    if (++nodes > MAX_PROJECT_ENTITY_NODES) invalid(path, `exceeds the ${MAX_PROJECT_ENTITY_NODES} entity node limit`);
    if (depth > MAX_PROJECT_ENTITY_DEPTH) invalid(path, `exceeds the ${MAX_PROJECT_ENTITY_DEPTH} entity depth limit`);
    record(value, path);
    identity(value.id, `${path}.id`);
    if (ancestors.has(value.id)) invalid(`${path}.id`, `ancestor identity cycle for "${value.id}"`);
    for (const field of ['name', 'originalName', 'originalRoot']) string(value[field], `${path}.${field}`);
    oneOf(value.category, `${path}.category`, categories);
    culture(value.cultureId, `${path}.cultureId`);
    if (value.cultureIds !== undefined) cultureList(value.cultureIds, `${path}.cultureIds`);
    optionalStrings(value, path, [
      'rootName', 'originalTitle', 'subtype', 'lastBranchSubtype', 'epithet', 'meaning', 'description',
    ]);
    if (value.parentId !== undefined) identity(value.parentId, `${path}.parentId`);
    if (value.pinned !== undefined) boolean(value.pinned, `${path}.pinned`);
    if (value.featureSubtype !== undefined) oneOf(value.featureSubtype, `${path}.featureSubtype`, ['orogeny', 'hydrology', 'wilds']);
    if (value.tags !== undefined) stringList(value.tags, `${path}.tags`);
    if (value.createdAt !== undefined) number(value.createdAt, `${path}.createdAt`, 0, Number.MAX_SAFE_INTEGER);
    if (value.anglicization !== undefined) validateOverlay(value.anglicization, `${path}.anglicization`);
    if (value.metadata !== undefined) {
      record(value.metadata, `${path}.metadata`);
      optionalStrings(value.metadata, `${path}.metadata`, ['subtype']);
      // New overlays encode a missing baseline epithet as null so JSON roundtrips
      // preserve absence; historical overlays used a string or undefined.
      if (value.metadata._originalEpithet !== undefined && value.metadata._originalEpithet !== null) {
        string(value.metadata._originalEpithet, `${path}.metadata._originalEpithet`);
      }
      if (value.metadata._originalEpithetPresent !== undefined) {
        boolean(value.metadata._originalEpithetPresent, `${path}.metadata._originalEpithetPresent`);
      }
      if (value.metadata.tier !== undefined) {
        number(value.metadata.tier, `${path}.metadata.tier`, 1, 4);
        if (!Number.isInteger(value.metadata.tier)) invalid(`${path}.metadata.tier`, 'must be an integer');
      }
    }

    // Pinned copies may legitimately have stale names, overlays, flags or children.
    // Compare only stable identity attributes, never whole snapshot equality.
    const previous = identities.get(value.id);
    const category = normalizeEntityCategory(value.category);
    if (previous) {
      if (previous.category !== category) invalid(`${path}.category`, `conflicting identity "${value.id}" (first seen at ${previous.path})`);
      if (previous.cultureId !== value.cultureId) invalid(`${path}.cultureId`, `conflicting identity "${value.id}" (first seen at ${previous.path})`);
      if (previous.parentId !== value.parentId) invalid(`${path}.parentId`, `conflicting identity "${value.id}" (first seen at ${previous.path})`);
    } else {
      identities.set(value.id, { category, cultureId: value.cultureId, parentId: value.parentId, path });
    }
    ancestors.add(value.id);
    if (value.children !== undefined) {
      array(value.children, `${path}.children`);
      for (let i = 0; i < value.children.length; i++) entity(value.children[i], `${path}.children[${i}]`, depth + 1);
    }
    ancestors.delete(value.id);
  }
  for (let i = 0; i < value.entities.length; i++) entity(value.entities[i], `entities[${i}]`, 1);
  for (let i = 0; i < value.pinnedEntityIds.length; i++) {
    const id = value.pinnedEntityIds[i];
    if (!identities.has(id)) invalid(`pinnedEntityIds[${i}]`, `unknown entity ID "${id}"`);
  }
}
