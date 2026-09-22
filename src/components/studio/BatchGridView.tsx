import React from 'react';
import {
  Sparkles,
  Pin,
  RefreshCw,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { useNominaStore } from '../../store/useNominaStore';
import { EntityNodeCard } from './EntityNodeCard';
import { cn } from '../../utils/cn';

export interface BatchGridViewProps {
  onInspectTree?: (entity: LoreEntity) => void;
  className?: string;
}

export const BatchGridView: React.FC<BatchGridViewProps> = ({
  onInspectTree,
  className,
}) => {
  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const activeEntityId = useNominaStore((s) => s.activeEntityId);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);
  const clearBatch = useNominaStore((s) => s.clearBatch);
  const generateBatch = useNominaStore((s) => s.generateBatch);
  const pinAllBatch = useNominaStore((s) => s.pinAllBatch);
  const reRollBatch = useNominaStore((s) => s.reRollBatch);
  const isGenerating = useNominaStore((s) => s.isGenerating);

  // Pin All: batch operation
  const handlePinAll = () => {
    pinAllBatch();
  };

  // Re-roll all entities in current batch
  const handleReRollAll = () => {
    reRollBatch();
  };

  const allPinned =
    generatedBatch.length > 0 && generatedBatch.every((e) => e.pinned);

  return (
    <div
      data-testid="batch-grid-view"
      className={cn('flex flex-col h-full w-full', className)}
    >
      {/* Batch Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-charcoal-800 bg-charcoal-950/40">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gold-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            Generated Entities
          </h2>
          <span
            data-testid="batch-count-badge"
            className="text-xs font-mono px-2 py-0.5 rounded-full bg-charcoal-800 border border-charcoal-700 text-gold-400 font-semibold"
          >
            {generatedBatch.length}
          </span>
        </div>

        {/* Batch Header Quick Actions */}
        {generatedBatch.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Pin All */}
            <button
              type="button"
              data-testid="pin-all-button"
              onClick={handlePinAll}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                allPinned
                  ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                  : 'bg-charcoal-900 border-charcoal-700/80 text-slate-300 hover:text-gold-400 hover:border-gold-500/30'
              )}
              title="Pin all entities in current batch to World Bible"
            >
              <Pin className={cn('w-3.5 h-3.5', allPinned && 'fill-gold-400 text-gold-400')} />
              <span>{allPinned ? 'All Pinned' : 'Pin All'}</span>
            </button>

            {/* Re-roll All */}
            <button
              type="button"
              data-testid="reroll-all-button"
              onClick={handleReRollAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-charcoal-900 border border-charcoal-700/80 text-slate-300 hover:text-gold-400 hover:border-gold-500/30 transition-colors"
              title="Re-roll all entities in current batch"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-roll All</span>
            </button>

            {/* Clear Batch */}
            <button
              type="button"
              data-testid="clear-batch-button"
              onClick={() => clearBatch()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-charcoal-900 border border-charcoal-700/80 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              title="Clear generated batch"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid Content or Empty State */}
      <div className="flex-1 p-6 overflow-y-auto">
        {generatedBatch.length === 0 ? (
          <div
            data-testid="empty-batch-state"
            className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center rounded-2xl border-2 border-dashed border-charcoal-800 bg-charcoal-900/30 max-w-xl mx-auto my-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-300/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-4 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.1)]">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-serif font-semibold text-slate-100 mb-2">
              No Entities in Active Batch
            </h3>

            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Configure your cultural origins, Markov order, and temperature,
              then click Generate to produce historically grounded names and
              lore entities.
            </p>

            <button
              type="button"
              data-testid="empty-generate-button"
              disabled={isGenerating}
              onClick={() => generateBatch()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-gold-400 to-gold-300 hover:from-gold-300 hover:to-gold-200 text-charcoal-950 shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.25)] hover:shadow-[0_0_25px_rgba(var(--color-accent-rgb),0.35)] transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate First Batch</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : (
          <div
            data-testid="batch-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5"
          >
            {generatedBatch.map((entity) => (
              <EntityNodeCard
                key={entity.id}
                entity={entity}
                mode="grid"
                isSelected={activeEntityId === entity.id}
                onSelect={(ent) => setActiveEntityId(ent.id)}
                onInspectTree={onInspectTree}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
