import React, { useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  Languages,
  Grid,
  GitBranch,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { normalizeEntityCategory } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface GeneratorControlsProps {
  viewMode?: 'grid' | 'tree';
  onViewModeChange?: (mode: 'grid' | 'tree') => void;
  className?: string;
}

const BATCH_PILLS = [1, 5, 10, 25, 50] as const;

const SUBTYPES_BY_CATEGORY: Record<string, string[]> = {
  character: ['auto', 'Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan'],
  settlement: ['auto', 'Metropolis', 'Fortress', 'Town', 'Haven', 'Village'],
  geography: ['auto', 'Mountain Range', 'River Basin', 'Primeval Woods'],
  faction: ['auto', 'Order', 'Legion', 'Covenant', 'Guild', 'Syndicate'],
  artifact: ['auto', 'Relic', 'Blade', 'Crown', 'Tome', 'Scepter'],
};

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({
  viewMode = 'grid',
  onViewModeChange,
  className,
}) => {
  const batchCount = useNominaStore((s) => s.batchCount);
  const setBatchCount = useNominaStore((s) => s.setBatchCount);
  const activeCategory = useNominaStore((s) => s.activeCategory);
  const targetSubtype = useNominaStore((s) => s.targetSubtype);
  const temperature = useNominaStore((s) => s.temperature);
  const markovOrder = useNominaStore((s) => s.markovOrder);
  const setEngineConfig = useNominaStore((s) => s.setEngineConfig);
  const anglicize = useNominaStore((s) => s.anglicize);
  const anglicizeMode = useNominaStore((s) => s.anglicizeMode);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);
  const setAnglicizationConfig = useNominaStore((s) => s.setAnglicizationConfig);
  const isGenerating = useNominaStore((s) => s.isGenerating);
  const generateBatch = useNominaStore((s) => s.generateBatch);

  const normalizedCat = normalizeEntityCategory(activeCategory);
  const availableSubtypes = SUBTYPES_BY_CATEGORY[normalizedCat] || ['auto'];

  // Keyboard shortcut listener: Cmd/Ctrl + Enter triggers generateBatch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating) {
          generateBatch();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [generateBatch, isGenerating]);

  return (
    <div
      data-testid="generator-controls"
      className={cn(
        'sticky top-0 z-10 w-full bg-charcoal-900/95 backdrop-blur-md border-b border-charcoal-700/80 px-4 py-3 shadow-md',
        className
      )}
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Primary Action & Batch Count */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Generate Button */}
          <button
            type="button"
            data-testid="generate-button"
            disabled={isGenerating}
            onClick={() => generateBatch()}
            className={cn(
              'relative group flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 select-none shadow-sm',
              isGenerating
                ? 'bg-gold-500/50 text-charcoal-950 cursor-not-allowed'
                : 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 shadow-md shadow-gold-500/25 hover:shadow-lg hover:shadow-gold-500/40 active:scale-[0.98]'
            )}
            title="Generate names based on current parameters (⌘ + Enter)"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-charcoal-950" />
            ) : (
              <Sparkles className="w-4 h-4 text-charcoal-950 transition-transform group-hover:rotate-12" />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-charcoal-950/20 text-charcoal-950/80 border border-charcoal-950/20 ml-1">
              ⌘⏎
            </kbd>
          </button>

          {/* Batch Count Selector Pills */}
          <div className="flex items-center gap-1.5 bg-charcoal-950/60 p-1 rounded-lg border border-charcoal-700/60">
            <span className="text-[11px] font-medium text-slate-400 px-1.5 hidden sm:inline">
              Batch:
            </span>
            {BATCH_PILLS.map((count) => {
              const isActive = batchCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  data-testid={`batch-pill-${count}`}
                  onClick={() => setBatchCount(count)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors',
                    isActive
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
                  )}
                >
                  {count}
                </button>
              );
            })}
          </div>

          {/* Target Subtype Selector */}
          <div className="flex items-center gap-1.5 bg-charcoal-950/60 px-2 py-1 rounded-lg border border-charcoal-700/60">
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              Subtype:
            </span>
            <select
              data-testid="target-subtype-select"
              value={targetSubtype}
              onChange={(e) => setEngineConfig({ targetSubtype: e.target.value })}
              className="bg-charcoal-900 text-xs text-gold-400 border border-charcoal-700/80 rounded px-2 py-0.5 focus:outline-none focus:border-gold-500/50 cursor-pointer font-medium"
              title="Filter generation to a specific subtype or 'auto'"
              aria-label="Target Subtype"
            >
              {availableSubtypes.map((sub) => (
                <option key={sub} value={sub} className="bg-charcoal-900 text-slate-200">
                  {sub === 'auto' ? 'Auto Subtype' : sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center/Right Section: Synthesis Controls (Temp, Markov, Anglicize, View Mode) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Temperature Slider */}
          <div
            className="flex items-center gap-2 bg-charcoal-950/60 px-2.5 py-1 rounded-lg border border-charcoal-700/60"
            title="Temperature: Balance between training data fidelity and creative innovation"
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-gold-400" />
                  Temp:
                </span>
                <span className="font-mono text-gold-400 font-semibold">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-slate-400 hidden xl:inline">Fidelity</span>
                <input
                  type="range"
                  data-testid="temperature-slider"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) =>
                    setEngineConfig({ temperature: parseFloat(e.target.value) })
                  }
                  className="w-20 sm:w-24 h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-gold-400 focus:outline-none"
                  aria-label="Temperature slider (Fidelity vs Innovation)"
                />
                <span className="text-[9px] text-slate-400 hidden xl:inline">Innovation</span>
              </div>
            </div>
          </div>

          {/* Markov Order Toggle */}
          <div
            className="flex items-center bg-charcoal-950/60 p-1 rounded-lg border border-charcoal-700/60 text-xs"
            title="Markov Order: Order 2 for fluid variety; Order 3 for strict phonetic fidelity"
          >
            <button
              type="button"
              data-testid="markov-order-2"
              onClick={() => setEngineConfig({ markovOrder: 2 })}
              className={cn(
                'px-2 py-1 rounded font-medium text-xs transition-colors',
                markovOrder === 2
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Order 2
            </button>
            <button
              type="button"
              data-testid="markov-order-3"
              onClick={() => setEngineConfig({ markovOrder: 3 })}
              className={cn(
                'px-2 py-1 rounded font-medium text-xs transition-colors',
                markovOrder === 3
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Order 3
            </button>
          </div>

          {/* Anglicization Toolbar */}
          <div className="flex items-center gap-1.5 bg-charcoal-950/60 p-1 rounded-lg border border-charcoal-700/60">
            {/* Global Anglicize Toggle */}
            <button
              type="button"
              data-testid="anglicize-toggle"
              onClick={() => setAnglicizationConfig({ anglicize: !anglicize })}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                anglicize
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
              )}
              title="Toggle Anglicization (Englishification)"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Anglicize</span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full ml-0.5',
                  anglicize ? 'bg-gold-400 animate-pulse' : 'bg-slate-400'
                )}
              />
            </button>

            {/* Mode Selector (Phonetic / Suffix / Full) */}
            <div className="flex items-center gap-1 border-l border-charcoal-700/80 pl-1.5">
              {(
                [
                  { id: 'phonetic', label: 'Phonetic' },
                  { id: 'suffix', label: 'Suffix' },
                  { id: 'full', label: 'Archaic' },
                ] as const
              ).map((m) => {
                const isModeActive = anglicizeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`anglicize-mode-${m.id}`}
                    disabled={!anglicize}
                    onClick={() => setAnglicizationConfig({ anglicizeMode: m.id })}
                    className={cn(
                      'px-1.5 py-0.5 text-[11px] rounded transition-colors',
                      !anglicize && 'opacity-40 cursor-not-allowed',
                      isModeActive && anglicize
                        ? 'bg-gold-500/20 text-gold-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                    title={
                      m.id === 'phonetic'
                        ? 'Phonetic Smoothing (eliminates clusters)'
                        : m.id === 'suffix'
                        ? 'Suffix Mapping (translates toponymic roots)'
                        : 'Anglo-Norman / Archaic localization'
                    }
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Exonym (Endonym) Dual Display Toggle */}
            <button
              type="button"
              data-testid="dual-display-toggle"
              disabled={!anglicize}
              onClick={() =>
                setAnglicizationConfig({ exonymDualDisplay: !exonymDualDisplay })
              }
              className={cn(
                'ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors',
                !anglicize && 'opacity-40 cursor-not-allowed',
                exonymDualDisplay && anglicize
                  ? 'bg-gold-500/10 text-gold-300 border-gold-500/40'
                  : 'text-slate-400 border-charcoal-700/60 hover:text-slate-200'
              )}
              title="Dual Display: Exonym (Endonym) format"
            >
              Dual
            </button>
          </div>

          {/* View Mode Switcher: Batch Grid vs Lineage Tree */}
          <div className="flex items-center bg-charcoal-950/60 p-1 rounded-lg border border-charcoal-700/60">
            <button
              type="button"
              data-testid="view-mode-grid"
              onClick={() => onViewModeChange?.('grid')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Batch Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
            <button
              type="button"
              data-testid="view-mode-tree"
              onClick={() => onViewModeChange?.('tree')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                viewMode === 'tree'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Interactive Lineage Tree View"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tree</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
