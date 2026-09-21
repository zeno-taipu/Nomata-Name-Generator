import React from 'react';
import {
  GitBranch,
  Network,
  ChevronRight,
  Plus,
  CornerDownRight,
  X,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { useNominaStore } from '../../store/useNominaStore';
import { EntityNodeCard } from './EntityNodeCard';
import { cn } from '../../utils/cn';

export interface LineageTreeViewProps {
  className?: string;
}

/**
 * Searches an entity list recursively for targetId and records ancestor trail
 */
function findEntityWithAncestors(
  entities: LoreEntity[],
  targetId: string,
  ancestors: LoreEntity[] = []
): { entity: LoreEntity; ancestors: LoreEntity[] } | null {
  for (const ent of entities) {
    if (ent.id === targetId) {
      return { entity: ent, ancestors };
    }
    if (ent.children && ent.children.length > 0) {
      const found = findEntityWithAncestors(ent.children, targetId, [
        ...ancestors,
        ent,
      ]);
      if (found) return found;
    }
  }
  return null;
}

export const LineageTreeView: React.FC<LineageTreeViewProps> = ({ className }) => {
  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const activeEntityId = useNominaStore((s) => s.activeEntityId);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);
  const branchEntity = useNominaStore((s) => s.branchEntity);

  // Combine batch and pinned entities for lineage inspection
  const allEntities = [...generatedBatch, ...pinnedEntities];

  // Determine focused entity and breadcrumb trail
  let focusedResult: { entity: LoreEntity; ancestors: LoreEntity[] } | null = null;
  if (activeEntityId) {
    focusedResult = findEntityWithAncestors(allEntities, activeEntityId);
  }

  // Determine root entities to render
  let rootEntities: LoreEntity[] = [];
  if (focusedResult) {
    // If active entity has ancestors, start from the root ancestor or focused entity
    rootEntities = [focusedResult.ancestors[0] || focusedResult.entity];
  } else {
    // Show entities that have children first across batch and pinned entities
    const allRoots = [
      ...generatedBatch,
      ...pinnedEntities.filter((p) => !p.parentId && !generatedBatch.some((b) => b.id === p.id)),
    ];
    const withChildren = allRoots.filter(
      (e) => e.children && e.children.length > 0
    );
    rootEntities = withChildren.length > 0 ? withChildren : allRoots;
  }

  const renderTreeNode = (node: LoreEntity, depth = 0): React.ReactNode => {
    const isTarget = activeEntityId === node.id;
    const tierLabels = [
      'Tier 1 (Root)',
      'Tier 2 (Subordinate)',
      'Tier 3 (Subdivision)',
      'Tier 4 (Micro-feature)',
    ];
    const tierBadge = tierLabels[Math.min(depth, tierLabels.length - 1)];

    return (
      <div
        key={node.id}
        data-testid={`tree-node-${node.id}`}
        className="relative group/node flex flex-col"
      >
        {/* Horizontal connector line for non-root nodes */}
        {depth > 0 && (
          <div
            data-testid="tree-connector"
            className="absolute -left-4 top-7 w-4 h-0.5 bg-gold-500/40"
          />
        )}

        <div className="flex flex-col gap-1.5 max-w-xl">
          {/* Node Tier and Hierarchy Step Badge */}
          <div className="flex items-center gap-2">
            <span
              data-testid="tree-tier-badge"
              className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider',
                depth === 0
                  ? 'bg-gold-500/15 border-gold-500/40 text-gold-400 font-semibold'
                  : 'bg-charcoal-800 border-charcoal-700 text-slate-400'
              )}
            >
              {tierBadge}
            </span>

            {depth > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <CornerDownRight className="w-3 h-3 text-gold-500/50" />
                <span>subordinate of {node.parentId ? 'lineage' : 'root'}</span>
              </span>
            )}
          </div>

          {/* Entity Card */}
          <EntityNodeCard
            entity={node}
            isSelected={isTarget}
            onSelect={(ent) => setActiveEntityId(ent.id)}
            className={cn(
              'w-full shadow-md',
              isTarget && 'ring-2 ring-gold-400/50 shadow-[0_0_20px_rgba(208,185,51,0.25)]'
            )}
          />

          {/* Quick "+ Add Subordinate Subdivision" Action Button */}
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              data-testid={`add-subdivision-${node.id}`}
              onClick={() => branchEntity(node.id, 'auto', 1)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-gold-300 bg-charcoal-900 hover:bg-charcoal-800 border border-charcoal-700/80 hover:border-gold-500/40 transition-colors shadow-sm"
              title="Quickly branch a subordinate subdivision"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>+ Add Subordinate Subdivision</span>
            </button>
          </div>
        </div>

        {/* Recursive Children Lineage Rendering with Connecting Line */}
        {node.children && node.children.length > 0 && (
          <div
            data-testid={`children-container-${node.id}`}
            className="border-l-2 border-gold-500/30 pl-4 ml-4 space-y-4 mt-3 relative"
          >
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="lineage-tree-view"
      className={cn('flex flex-col h-full w-full', className)}
    >
      {/* Tree View Header & Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-charcoal-800 bg-charcoal-950/40">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-gold-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            Interactive Lineage Tree
          </h2>
        </div>

        {/* Breadcrumb Navigation Trail */}
        {focusedResult && (
          <div
            data-testid="tree-breadcrumbs"
            className="flex items-center gap-1.5 text-xs bg-charcoal-900 px-3 py-1 rounded-lg border border-charcoal-700/80"
          >
            <button
              type="button"
              data-testid="breadcrumb-all"
              onClick={() => setActiveEntityId(null)}
              className="text-slate-400 hover:text-gold-400 transition-colors"
            >
              All Trees
            </button>

            {focusedResult.ancestors.map((ancestor) => (
              <React.Fragment key={ancestor.id}>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <button
                  type="button"
                  data-testid={`breadcrumb-${ancestor.id}`}
                  onClick={() => setActiveEntityId(ancestor.id)}
                  className="text-slate-400 hover:text-gold-400 font-serif truncate max-w-[120px]"
                >
                  {ancestor.name}
                </button>
              </React.Fragment>
            ))}

            <ChevronRight className="w-3 h-3 text-gold-400" />
            <span className="text-gold-400 font-serif font-semibold truncate max-w-[140px]">
              {focusedResult.entity.name}
            </span>

            <button
              type="button"
              data-testid="clear-focus-button"
              onClick={() => setActiveEntityId(null)}
              className="ml-1 p-0.5 text-slate-400 hover:text-slate-200"
              title="Clear Focus (Show All)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Tree Canvas */}
      <div className="flex-1 p-6 overflow-y-auto">
        {rootEntities.length === 0 ? (
          <div
            data-testid="empty-tree-state"
            className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center rounded-2xl border-2 border-dashed border-charcoal-800 bg-charcoal-900/30 max-w-xl mx-auto my-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/5 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-4 shadow-[0_0_20px_rgba(208,185,51,0.1)]">
              <GitBranch className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-serif font-semibold text-slate-100 mb-2">
              No Lineage Hierarchies Available
            </h3>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-4">
              Generate a batch of entities in the Grid view and click{' '}
              <strong className="text-gold-400">+ Branch</strong> on any entity
              to construct multi-tier geographic, urban, or dynasty lineages.
            </p>
          </div>
        ) : (
          <div data-testid="tree-canvas" className="space-y-8">
            {rootEntities.map((root) => renderTreeNode(root, 0))}
          </div>
        )}
      </div>
    </div>
  );
};
