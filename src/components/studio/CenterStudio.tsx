import React, { useState } from 'react';
import { Layers, Pin } from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { GeneratorControls } from './GeneratorControls';
import { BatchGridView } from './BatchGridView';
import { LineageTreeView } from './LineageTreeView';
import { cn } from '../../utils/cn';

export interface CenterStudioProps {
  className?: string;
  defaultViewMode?: 'grid' | 'tree';
  viewMode?: 'grid' | 'tree';
  onViewModeChange?: (mode: 'grid' | 'tree') => void;
}

export const CenterStudio: React.FC<CenterStudioProps> = ({
  className,
  defaultViewMode = 'grid',
  viewMode: controlledViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'tree'>(defaultViewMode);
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const handleViewModeChange = (mode: 'grid' | 'tree') => {
    if (controlledViewMode === undefined) {
      setInternalViewMode(mode);
    }
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const activeCategory = useNominaStore((s) => s.activeCategory);
  const activeCultureIds = useNominaStore((s) => s.activeCultureIds);
  const temperature = useNominaStore((s) => s.temperature);
  const markovOrder = useNominaStore((s) => s.markovOrder);
  const anglicize = useNominaStore((s) => s.anglicize);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);

  // Derive culture names for summary
  const cultureNames = activeCultureIds
    .map((id) => getCultureById(id)?.name || id)
    .join(', ');

  return (
    <div
      data-testid="center-studio"
      className={cn(
        'relative flex flex-col flex-1 h-full min-w-0 bg-charcoal-950 overflow-hidden',
        className
      )}
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      {/* Top Sticky Toolbar */}
      <GeneratorControls
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Central Viewport */}
      <main className="flex-1 overflow-hidden flex flex-col relative min-h-0">
        {viewMode === 'grid' ? (
          <BatchGridView
            onInspectTree={(entity) => {
              setActiveEntityId(entity.id);
              handleViewModeChange('tree');
            }}
          />
        ) : (
          <LineageTreeView />
        )}
      </main>

      {/* Floating Bottom Stats Bar */}
      <footer
        data-testid="studio-stats-bar"
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 border-t border-charcoal-800/80 bg-charcoal-900/90 backdrop-blur-md text-xs text-slate-400 z-10 shrink-0"
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--color-border)' }}
      >
        {/* Left Stats: Batch Count & Pinned Count */}
        <div className="flex items-center gap-4">
          <div
            data-testid="stats-batch-count"
            className="flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-gold-400" />
            <span>
              Batch:{' '}
              <strong className="text-slate-200 font-mono font-medium">
                {generatedBatch.length}
              </strong>
            </span>
          </div>

          <div
            data-testid="stats-pinned-count"
            className="flex items-center gap-1.5"
          >
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>
              Bible Pinned:{' '}
              <strong className="text-slate-200 font-mono font-medium">
                {pinnedEntities.length}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Stats: Culture, Category, Engine Config Summary */}
        <div
          data-testid="stats-engine-summary"
          className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400"
        >
          <span className="capitalize font-medium text-gold-400">
            {activeCategory}
          </span>
          <span>&bull;</span>
          <span className="text-slate-300 truncate max-w-[200px]" title={cultureNames}>
            {cultureNames || 'Standard'}
          </span>
          <span>&bull;</span>
          <span className="font-mono">{`T:${temperature.toFixed(2)}`}</span>
          <span>&bull;</span>
          <span className="font-mono">{`Ord:${markovOrder}`}</span>
          <span>&bull;</span>
          <span
            className={cn(
              'font-mono font-semibold',
              anglicize ? 'text-gold-400' : 'text-slate-400'
            )}
          >
            {`EN:${anglicize ? 'ON' : 'OFF'}`}
          </span>
        </div>
      </footer>
    </div>
  );
};
