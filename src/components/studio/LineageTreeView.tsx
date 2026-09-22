import React, { useState } from 'react';
import {
  GitBranch,
  Network,
  ChevronRight,
  ChevronLeft,
  CornerDownRight,
  X,
  Sliders,
  Languages,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { useNominaStore } from '../../store/useNominaStore';
import { EntityNodeCard } from './EntityNodeCard';
import { cn } from '../../utils/cn';

export interface LineageTreeViewProps {
  onBackToGrid?: () => void;
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

export const LineageTreeView: React.FC<LineageTreeViewProps> = ({
  onBackToGrid,
  className,
}) => {
  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const activeEntityId = useNominaStore((s) => s.activeEntityId);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);

  // Temperature and Anglicize configuration from store
  const temperature = useNominaStore((s) => s.temperature);
  const setEngineConfig = useNominaStore((s) => s.setEngineConfig);
  const anglicize = useNominaStore((s) => s.anglicize);
  const anglicizeMode = useNominaStore((s) => s.anglicizeMode);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);
  const setAnglicizationConfig = useNominaStore((s) => s.setAnglicizationConfig);

  // Floating controls hover states
  const [isTempOpen, setIsTempOpen] = useState<boolean>(false);
  const [isAnglicizeOpen, setIsAnglicizeOpen] = useState<boolean>(false);

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
        {/* Horizontal connector line for non-root nodes (aligned with 32px offset: -left-8 w-8) */}
        {depth > 0 && (
          <div
            data-testid="tree-connector"
            className="absolute -left-8 top-7 w-8 h-0.5 bg-gold-500/40"
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

          {/* Entity Card in Tree Mode (branch and plus buttons present, no tree pill button) */}
          <EntityNodeCard
            entity={node}
            mode="tree"
            isSelected={isTarget}
            onSelect={(ent) => setActiveEntityId(ent.id)}
            className={cn(
              'w-full shadow-md',
              isTarget && 'ring-2 ring-gold-400/50 shadow-[0_0_20px_rgba(208,185,51,0.25)]'
            )}
          />
        </div>

        {/* Recursive Children Lineage Rendering with Connecting Line (Increased offset by 16px: pl-8 ml-8 / 32px offset) */}
        {node.children && node.children.length > 0 && (
          <div
            data-testid={`children-container-${node.id}`}
            className="border-l-2 border-gold-500/30 pl-8 ml-8 space-y-4 mt-3 relative"
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
      className={cn('relative flex flex-col h-full w-full', className)}
    >
      {/* Tree View Header & Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-charcoal-800 bg-charcoal-950/40">
        <div className="flex items-center gap-2.5">
          {/* Back to Grid Chevron Button */}
          {onBackToGrid && (
            <button
              type="button"
              data-testid="back-to-grid-button"
              aria-label="Back to Card Grid View"
              title="Back to Card Grid View"
              onClick={onBackToGrid}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-gold-400 bg-charcoal-900 hover:bg-charcoal-800 border border-charcoal-700 hover:border-gold-500/40 transition-colors shadow-sm select-none"
            >
              <ChevronLeft className="w-4 h-4 text-gold-400" />
              <span>Grid</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-gold-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Interactive Lineage Tree
            </h2>
          </div>
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

      {/* Floating Synthesis Controls (Temperature & Anglicize) on Right Edge */}
      <aside
        data-testid="tree-floating-controls"
        className="absolute right-4 top-16 z-30 flex flex-col gap-3 pointer-events-auto"
        aria-label="Tree Canvas Quick Controls"
      >
        {/* Temperature Floating Control */}
        <div
          data-testid="tree-temp-floating-container"
          className="relative group/temp"
          onMouseEnter={() => setIsTempOpen(true)}
          onMouseLeave={() => setIsTempOpen(false)}
        >
          {/* Trigger Button */}
          <button
            type="button"
            data-testid="tree-temp-floating-button"
            onClick={() => setIsTempOpen((prev) => !prev)}
            aria-label="Adjust Temperature & Creativity"
            title={`Temperature: ${temperature.toFixed(2)} (Hover to adjust)`}
            className={cn(
              'flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-charcoal-900/90 border shadow-lg backdrop-blur-md transition-all',
              isTempOpen
                ? 'border-gold-500/80 text-gold-400 shadow-[0_0_12px_rgba(208,185,51,0.25)] bg-charcoal-800'
                : 'border-charcoal-700/80 text-slate-300 hover:text-gold-400 hover:border-gold-500/50 hover:bg-charcoal-800'
            )}
          >
            <Sliders className="w-4 h-4 text-gold-400" />
            <span className="text-[9px] font-mono font-semibold text-gold-400 -mt-0.5">
              {temperature.toFixed(1)}
            </span>
          </button>

          {/* Temperature Popover Modal */}
          <div
            data-testid="tree-temp-popover"
            className={cn(
              'absolute right-full top-0 mr-3 w-72 p-4 rounded-xl bg-charcoal-900/95 border border-charcoal-700/90 shadow-2xl backdrop-blur-md transition-all duration-200 z-40 text-slate-200',
              isTempOpen
                ? 'opacity-100 translate-x-0 pointer-events-auto visible'
                : 'opacity-0 translate-x-2 pointer-events-none invisible group-hover/temp:opacity-100 group-hover/temp:translate-x-0 group-hover/temp:pointer-events-auto group-hover/temp:visible'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-800 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Sliders className="w-3.5 h-3.5 text-gold-400" />
                <span>Temperature & Innovation</span>
              </div>
              <span className="font-mono text-xs font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/30">
                {temperature.toFixed(2)}
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                data-testid="tree-temperature-slider"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) =>
                  setEngineConfig({ temperature: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-gold-400 focus:outline-none"
                aria-label="Temperature slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Fidelity (0.1)</span>
                <span>Innovation (1.0)</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-charcoal-800">
              <span className="text-[10px] text-slate-400">Presets:</span>
              {[
                { label: 'Strict', val: 0.3 },
                { label: 'Balanced', val: 0.7 },
                { label: 'Wild', val: 0.95 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  data-testid={`tree-temp-preset-${preset.val}`}
                  onClick={() => setEngineConfig({ temperature: preset.val })}
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded font-mono transition-colors',
                    Math.abs(temperature - preset.val) < 0.05
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                      : 'bg-charcoal-800 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Anglicize Floating Control */}
        <div
          data-testid="tree-anglicize-floating-container"
          className="relative group/anglicize"
          onMouseEnter={() => setIsAnglicizeOpen(true)}
          onMouseLeave={() => setIsAnglicizeOpen(false)}
        >
          {/* Trigger Button */}
          <button
            type="button"
            data-testid="tree-anglicize-floating-button"
            onClick={() => setIsAnglicizeOpen((prev) => !prev)}
            aria-label="Anglicize Configuration"
            title={`Anglicization: ${anglicize ? 'ON' : 'OFF'} (Hover to configure)`}
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-xl bg-charcoal-900/90 border shadow-lg backdrop-blur-md transition-all',
              isAnglicizeOpen || anglicize
                ? 'border-gold-500/80 text-gold-400 shadow-[0_0_12px_rgba(208,185,51,0.25)] bg-charcoal-800'
                : 'border-charcoal-700/80 text-slate-300 hover:text-gold-400 hover:border-gold-500/50 hover:bg-charcoal-800'
            )}
          >
            <Languages className="w-4 h-4 text-gold-400" />
            <span
              className={cn(
                'absolute top-1.5 right-1.5 w-2 h-2 rounded-full transition-colors',
                anglicize ? 'bg-gold-400 animate-pulse' : 'bg-charcoal-600'
              )}
            />
          </button>

          {/* Anglicize Popover Modal */}
          <div
            data-testid="tree-anglicize-popover"
            className={cn(
              'absolute right-full top-0 mr-3 w-72 p-4 rounded-xl bg-charcoal-900/95 border border-charcoal-700/90 shadow-2xl backdrop-blur-md transition-all duration-200 z-40 text-slate-200',
              isAnglicizeOpen
                ? 'opacity-100 translate-x-0 pointer-events-auto visible'
                : 'opacity-0 translate-x-2 pointer-events-none invisible group-hover/anglicize:opacity-100 group-hover/anglicize:translate-x-0 group-hover/anglicize:pointer-events-auto group-hover/anglicize:visible'
            )}
          >
            {/* Header & Toggle */}
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-800 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Languages className="w-3.5 h-3.5 text-gold-400" />
                <span>Anglicization</span>
              </div>
              <button
                type="button"
                data-testid="tree-anglicize-toggle"
                onClick={() => setAnglicizationConfig({ anglicize: !anglicize })}
                className={cn(
                  'px-2.5 py-0.5 rounded text-xs font-medium border transition-colors',
                  anglicize
                    ? 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                    : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200'
                )}
              >
                {anglicize ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Mode Selectors */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">Mode</label>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'phonetic', label: 'Phonetic' },
                    { id: 'suffix', label: 'Suffix' },
                    { id: 'full', label: 'Archaic' },
                  ] as const
                ).map((m) => {
                  const isActive = anglicizeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-testid={`tree-anglicize-mode-${m.id}`}
                      disabled={!anglicize}
                      onClick={() => setAnglicizationConfig({ anglicizeMode: m.id })}
                      className={cn(
                        'py-1 text-xs rounded border text-center transition-colors font-medium',
                        !anglicize && 'opacity-40 cursor-not-allowed border-charcoal-800 text-slate-500',
                        anglicize && isActive
                          ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-sm'
                          : 'bg-charcoal-800/80 border-charcoal-700/60 text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual Display Option */}
            <div className="mt-3 pt-2.5 border-t border-charcoal-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">Dual Display (Exonym)</span>
              <button
                type="button"
                data-testid="tree-dual-display-toggle"
                disabled={!anglicize}
                onClick={() =>
                  setAnglicizationConfig({ exonymDualDisplay: !exonymDualDisplay })
                }
                className={cn(
                  'px-2 py-0.5 text-xs font-mono rounded border transition-colors',
                  !anglicize && 'opacity-40 cursor-not-allowed border-charcoal-800 text-slate-500',
                  anglicize && exonymDualDisplay
                    ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                    : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200'
                )}
              >
                {exonymDualDisplay ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Tree Canvas */}
      <div className="flex-1 p-6 overflow-y-auto">
        {rootEntities.length === 0 ? (
          <div
            data-testid="empty-tree-state"
            className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center rounded-2xl border-2 border-dashed border-charcoal-800 bg-charcoal-900/30 max-w-xl mx-auto my-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-300/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-4 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.1)]">
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
