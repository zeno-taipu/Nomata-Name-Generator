import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { cn } from '../../utils/cn';

export interface GeneratorDrawerProps {
  isCollapsed?: boolean;
  className?: string;
}

const BATCH_PILLS = [1, 5, 10, 25, 50] as const;

export const SUBTYPES_BY_CATEGORY: Record<string, string[]> = {
  character: ['auto', 'Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan'],
  settlement: ['auto', 'Metropolis', 'Fortress', 'Town', 'Haven', 'Village'],
  geography: ['auto', 'Mountain Range', 'River Basin', 'Primeval Woods'],
  faction: ['auto', 'Order', 'Legion', 'Covenant', 'Guild', 'Syndicate'],
  artifact: ['auto', 'Relic', 'Blade', 'Crown', 'Tome', 'Scepter'],
};

export const GeneratorDrawer: React.FC<GeneratorDrawerProps> = ({
  isCollapsed = false,
  className,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);

  const isGenerating = useNominaStore((s) => s.isGenerating);
  const generateBatch = useNominaStore((s) => s.generateBatch);
  const batchCount = useNominaStore((s) => s.batchCount);
  const setBatchCount = useNominaStore((s) => s.setBatchCount);
  const temperature = useNominaStore((s) => s.temperature);
  const markovOrder = useNominaStore((s) => s.markovOrder);
  const setEngineConfig = useNominaStore((s) => s.setEngineConfig);

  // Global Keyboard Shortcut: ⌘/Ctrl + Enter to trigger generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating) {
          generateBatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, generateBatch]);

  if (isCollapsed) {
    return (
      <div className={cn('p-3 flex justify-center', className)}>
        <button
          type="button"
          data-testid="sidebar-generate-button"
          aria-label="Generate names (⌘⏎)"
          title="Generate names (⌘⏎)"
          disabled={isGenerating}
          onClick={() => !isGenerating && generateBatch()}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md',
            isGenerating
              ? 'bg-gold-500/40 text-charcoal-950 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 shadow-gold-500/20 active:scale-95'
          )}
        >
          {isGenerating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="sidebar-generator-drawer-container"
      className={cn(
        'p-3 border-b border-charcoal-800 bg-charcoal-950/60 transition-all select-none',
        className
      )}
    >
      {/* Top Row: Primary Generate Button + Chevron to Reveal Options */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="sidebar-generate-button"
          data-testid-alias="generator-generate-button"
          onClick={() => !isGenerating && generateBatch()}
          disabled={isGenerating}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs tracking-wide transition-all duration-200 shadow-md select-none',
            isGenerating
              ? 'bg-gold-500/40 text-charcoal-950 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 shadow-gold-500/20 active:scale-[0.98]'
          )}
          title="Generate names based on current parameters (⌘⏎)"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin text-charcoal-950" />
          ) : (
            <Sparkles className="w-4 h-4 text-charcoal-950 transition-transform group-hover:rotate-12" />
          )}
          <span className="font-bold">{isGenerating ? 'Generating...' : 'Generate'}</span>
          <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono px-1 py-0.5 rounded bg-charcoal-950/20 text-charcoal-950/80 border border-charcoal-950/20 ml-0.5">
            ⌘⏎
          </kbd>
        </button>

        {/* Chevron Button to expand options downwards */}
        <button
          type="button"
          data-testid="sidebar-generator-options-toggle"
          onClick={() => setIsOptionsOpen((prev) => !prev)}
          aria-expanded={isOptionsOpen}
          aria-label={isOptionsOpen ? 'Collapse generation options' : 'Expand generation options'}
          title={isOptionsOpen ? 'Collapse options' : 'Configure batch size, temperature, Markov order & Anglicization'}
          className={cn(
            'p-2 rounded-lg border transition-colors flex items-center justify-center',
            isOptionsOpen
              ? 'bg-gold-500/20 text-gold-400 border-gold-500/50 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
              : 'bg-charcoal-900 text-slate-300 border-charcoal-700 hover:text-gold-400 hover:border-gold-500/40 hover:bg-charcoal-850'
          )}
        >
          {isOptionsOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Downward Expandable Drawer with all Options */}
      {isOptionsOpen && (
        <div
          data-testid="sidebar-generator-options-drawer"
          className="mt-3 pt-3 border-t border-charcoal-800 space-y-3.5 text-xs text-slate-300 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* 1. Batch Count Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Batch Count:</span>
              <span className="font-mono text-gold-400 font-semibold">{batchCount}</span>
            </div>
            <div className="flex items-center gap-1 bg-charcoal-900 p-1 rounded-lg border border-charcoal-750 justify-between">
              {BATCH_PILLS.map((count) => {
                const isActive = batchCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    data-testid={`batch-pill-${count}`}
                    onClick={() => setBatchCount(count)}
                    className={cn(
                      'flex-1 py-1 text-xs font-mono font-medium rounded transition-colors text-center',
                      isActive
                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
                    )}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-gold-400" />
                <span>Temperature:</span>
              </span>
              <span className="font-mono text-gold-400 font-semibold bg-gold-500/10 px-1.5 py-0.2 rounded border border-gold-500/30">
                {temperature.toFixed(2)}
              </span>
            </div>
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
              className="w-full h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-gold-400 focus:outline-none"
              aria-label="Temperature slider (Fidelity vs Innovation)"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Fidelity (0.1)</span>
              <span>Innovation (1.0)</span>
            </div>
          </div>

          {/* 3. Markov Order Toggle */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-slate-400">Markov Order:</div>
            <div className="grid grid-cols-2 gap-1.5 bg-charcoal-900 p-1 rounded-lg border border-charcoal-750">
              <button
                type="button"
                data-testid="markov-order-2"
                onClick={() => setEngineConfig({ markovOrder: 2 })}
                className={cn(
                  'py-1 text-xs font-medium rounded transition-colors text-center',
                  markovOrder === 2
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Order 2 (Fluid)
              </button>
              <button
                type="button"
                data-testid="markov-order-3"
                onClick={() => setEngineConfig({ markovOrder: 3 })}
                className={cn(
                  'py-1 text-xs font-medium rounded transition-colors text-center',
                  markovOrder === 3
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Order 3 (Strict)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorDrawer;
