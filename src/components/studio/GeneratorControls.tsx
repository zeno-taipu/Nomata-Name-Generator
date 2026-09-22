import React, { useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  Languages,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCategorySubtypes } from '../../config/entitySubtypes';
import { cn } from '../../utils/cn';

export interface GeneratorControlsProps {
  className?: string;
}

const BATCH_PILLS = [1, 5, 10, 25, 50] as const;

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({
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

  const availableSubtypes = getCategorySubtypes(activeCategory);

  // Keyboard shortcut listener: Cmd/Ctrl + Enter triggers generateBatch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.('[role="dialog"]')) return;
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
                ? 'opacity-50 btn-accent-primary cursor-not-allowed'
                : 'btn-accent-primary'
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
                      ? 'bg-gold-500/20 text-gold-400 pill-accent font-semibold shadow-sm'
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
              className="bg-charcoal-900 text-xs theme-text-accent border border-charcoal-700/80 rounded px-2 py-0.5 focus:outline-none focus:theme-border-accent cursor-pointer font-medium"
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
                  <Sliders className="w-3 h-3 theme-text-accent" />
                  Temp:
                </span>
                <span className="font-mono theme-text-accent font-semibold">
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
                  className="w-20 sm:w-24 h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] focus:outline-none"
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
                  ? 'pill-accent font-semibold shadow-sm'
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
                  ? 'pill-accent font-semibold shadow-sm'
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
                  ? 'pill-accent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
              )}
              title="Toggle Anglicization (Englishification)"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Anglicize</span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full ml-0.5',
                  anglicize ? 'theme-bg-accent animate-pulse' : 'bg-slate-400'
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
                        ? 'pill-accent font-semibold'
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
                  ? 'pill-accent font-semibold'
                  : 'text-slate-400 border-charcoal-700/60 hover:text-slate-200'
              )}
              title="Dual Display: Exonym (Endonym) format"
            >
              Dual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
