import type { LoreEntity, NominaProjectBible } from '../types/domain';

export interface MarkdownExportOptions {
  includeWikilinks?: boolean;
}

/**
 * Helper to escape CSV cell contents according to RFC 4180
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a fast lookup map from entity ID to entity name across a tree
 */
function buildIdToNameMap(entities: LoreEntity[], map = new Map<string, string>()): Map<string, string> {
  for (const entity of entities) {
    map.set(entity.id, entity.name);
    if (entity.children && entity.children.length > 0) {
      buildIdToNameMap(entity.children, map);
    }
  }
  return map;
}

/**
 * Flattens a recursive entity hierarchy into a single list with parent names resolved
 */
function flattenEntitiesWithParent(
  entities: LoreEntity[],
  idMap: Map<string, string>,
  fallbackParentName?: string
): Array<{ entity: LoreEntity; parentName?: string }> {
  const result: Array<{ entity: LoreEntity; parentName?: string }> = [];

  for (const entity of entities) {
    const parentName = (entity.parentId ? idMap.get(entity.parentId) : undefined) ?? fallbackParentName;
    result.push({ entity, parentName });

    if (entity.children && entity.children.length > 0) {
      result.push(...flattenEntitiesWithParent(entity.children, idMap, entity.name));
    }
  }

  return result;
}

/**
 * Renders nested bullet point hierarchy for an entity's children
 */
function renderHierarchyBullets(
  children: LoreEntity[],
  indent: number,
  includeWikilinks: boolean
): string[] {
  const lines: string[] = [];
  const indentSpace = '  '.repeat(indent);

  for (const child of children) {
    const linkName = includeWikilinks ? `[[${child.name}]]` : child.name;
    const subtypePart = child.subtype ? ` (${child.subtype})` : '';
    lines.push(`${indentSpace}- ${linkName}${subtypePart}`);

    if (child.children && child.children.length > 0) {
      lines.push(...renderHierarchyBullets(child.children, indent + 1, includeWikilinks));
    }
  }

  return lines;
}

/**
 * Recursively renders markdown sections for an entity and its descendants
 */
function renderEntityMarkdown(
  entity: LoreEntity,
  depth: number,
  idMap: Map<string, string>,
  options: MarkdownExportOptions,
  fallbackParentName?: string
): string[] {
  const lines: string[] = [];
  const includeWikilinks = options.includeWikilinks !== false;

  // Header level between 1 (#) and 6 (######)
  const headerLevel = Math.min(Math.max(depth, 1), 6);
  const headerPrefix = '#'.repeat(headerLevel);

  lines.push(`${headerPrefix} ${entity.name}`);
  lines.push('');

  // Metadata summary
  lines.push(`- **Culture:** ${entity.cultureId}`);
  lines.push(`- **Category:** ${entity.category}`);
  if (entity.subtype) {
    lines.push(`- **Subtype:** ${entity.subtype}`);
  }
  lines.push(`- **Original Name:** ${entity.originalName ?? entity.name}`);
  if (entity.rootName || entity.originalRoot) {
    lines.push(`- **Root:** ${entity.rootName ?? entity.originalRoot}`);
  }
  if (entity.epithet) {
    lines.push(`- **Epithet:** ${entity.epithet}`);
  }

  // Parent linkage
  const resolvedParentName = (entity.parentId ? idMap.get(entity.parentId) : undefined) ?? fallbackParentName;
  if (resolvedParentName) {
    const parentDisplay = includeWikilinks ? `[[${resolvedParentName}]]` : resolvedParentName;
    lines.push(`- **Parent:** Part of ${parentDisplay}`);
  }

  // Description & Meaning
  if (entity.meaning) {
    lines.push(`- **Meaning:** ${entity.meaning}`);
  }
  if (entity.description) {
    lines.push('');
    lines.push(entity.description);
  }

  // Nested child hierarchy summary
  if (entity.children && entity.children.length > 0) {
    lines.push('');
    lines.push('### Lineage Hierarchy');
    lines.push(...renderHierarchyBullets(entity.children, 0, includeWikilinks));
  }

  lines.push('');

  // Recursively render child entity sections
  if (entity.children && entity.children.length > 0) {
    for (const child of entity.children) {
      lines.push(...renderEntityMarkdown(child, depth + 1, idMap, options, entity.name));
    }
  }

  return lines;
}

/**
 * Exports LoreEntity collection to structured Markdown with frontmatter,
 * metadata summaries, lineage hierarchy bullet points, and wikilinks.
 */
export function exportToMarkdown(
  entities: LoreEntity[],
  options?: MarkdownExportOptions
): string {
  const idMap = buildIdToNameMap(entities);
  const includeWikilinks = options?.includeWikilinks ?? true;
  const opts: MarkdownExportOptions = { includeWikilinks };

  const lines: string[] = [
    '---',
    'title: Nomina World Bible Export',
    `entity_count: ${entities.length}`,
    `exported_at: ${new Date().toISOString()}`,
    '---',
    '',
  ];

  if (entities.length === 0) {
    lines.push('_No entities exported._');
    return lines.join('\n');
  }

  for (const entity of entities) {
    lines.push(...renderEntityMarkdown(entity, 1, idMap, opts));
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Exports LoreEntity collection to JSON, preserving complete nested tree structures.
 */
export function exportToJSON(entities: LoreEntity[], pretty = true): string {
  return JSON.stringify(entities, null, pretty ? 2 : undefined);
}

/**
 * Exports LoreEntity collection to flattened CSV format.
 * Header: ID,Name,OriginalName,Category,Subtype,Culture,Root,ParentID,ParentName,Anglicized
 */
export function exportToCSV(entities: LoreEntity[]): string {
  const headers = [
    'ID',
    'Name',
    'OriginalName',
    'Category',
    'Subtype',
    'Culture',
    'Root',
    'ParentID',
    'ParentName',
    'Anglicized',
  ];

  const idMap = buildIdToNameMap(entities);
  const flattened = flattenEntitiesWithParent(entities, idMap);

  const rows = flattened.map(({ entity, parentName }) => {
    const isAnglicized = entity.anglicization?.enabled ? 'true' : 'false';
    const root = entity.rootName ?? entity.originalRoot ?? '';

    return [
      escapeCsvCell(entity.id),
      escapeCsvCell(entity.name),
      escapeCsvCell(entity.originalName ?? entity.name),
      escapeCsvCell(entity.category),
      escapeCsvCell(entity.subtype ?? ''),
      escapeCsvCell(entity.cultureId ?? ''),
      escapeCsvCell(root),
      escapeCsvCell(entity.parentId ?? ''),
      escapeCsvCell(parentName ?? ''),
      escapeCsvCell(isAnglicized),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n') + '\n';
}

/**
 * Serializes a NominaProjectBible object to formatted JSON string (.nomina.json)
 */
export function exportToProjectBible(state: NominaProjectBible): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parses and validates a Nomina Project Bible JSON string
 */
export function importFromProjectBible(jsonString: string): NominaProjectBible {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Invalid project bible: input must be a non-empty string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse Nomina Project Bible JSON: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid project bible: root must be an object');
  }

  const bible = parsed as Partial<NominaProjectBible>;

  if (!bible.version || typeof bible.version !== 'string') {
    throw new Error('Invalid project bible: missing or invalid "version"');
  }

  if (!Array.isArray(bible.entities)) {
    throw new Error('Invalid project bible: "entities" must be an array');
  }

  if (!bible.settings || typeof bible.settings !== 'object') {
    throw new Error('Invalid project bible: missing or invalid "settings"');
  }

  return {
    version: bible.version,
    name: bible.name ?? 'Nomina World Bible',
    entities: bible.entities,
    pinnedEntityIds: Array.isArray(bible.pinnedEntityIds) ? bible.pinnedEntityIds : [],
    customVocabulary: {
      honorifics: bible.customVocabulary?.honorifics ?? [],
      customSeeds: bible.customVocabulary?.customSeeds,
      customPrefixes: bible.customVocabulary?.customPrefixes ?? [],
      customSuffixes: bible.customVocabulary?.customSuffixes ?? [],
    },
    settings: {
      activeCultureIds: Array.isArray(bible.settings.activeCultureIds)
        ? bible.settings.activeCultureIds
        : ['danubian_slavic'],
      cultureWeights: bible.settings.cultureWeights ?? {},
      anglicize: Boolean(bible.settings.anglicize),
      anglicizeMode: bible.settings.anglicizeMode ?? 'phonetic',
      exonymDualDisplay: Boolean(bible.settings.exonymDualDisplay),
      temperature: typeof bible.settings.temperature === 'number' ? bible.settings.temperature : 0.7,
      markovOrder: typeof bible.settings.markovOrder === 'number' ? bible.settings.markovOrder : 2,
    },
    savedAt: typeof bible.savedAt === 'number' ? bible.savedAt : Date.now(),
  };
}
