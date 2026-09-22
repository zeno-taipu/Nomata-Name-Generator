import React, { useState } from 'react';
import {
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { cultureList } from '../../data/cultures';
import type { CultureProfile } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface CultureSelectorProps {
  isCollapsed?: boolean;
  className?: string;
}

export const CultureSelector: React.FC<CultureSelectorProps> = ({
  isCollapsed = false,
  className,
}) => {
  const activeCultureIds = useNominaStore((state) => state.activeCultureIds);
  const cultureWeights = useNominaStore((state) => state.cultureWeights);
  const setActiveCultureIds = useNominaStore((state) => state.setActiveCultureIds);

  const [manualMashup, setManualMashup] = useState<boolean>(false);
  const isMashupMode = activeCultureIds.length > 1 || manualMashup;
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Toggle Mashup Mode
  const handleToggleMashupMode = () => {
    if (isMashupMode) {
      setManualMashup(false);
      // Switch to single select mode: keep only the first active culture
      const primaryId = activeCultureIds[0] || 'danubian_slavic';
      setActiveCultureIds([primaryId], { [primaryId]: 1.0 });
    } else {
      setManualMashup(true);
    }
  };

  // Select culture in single-select mode
  const handleSelectSingleCulture = (cultureId: string) => {
    setActiveCultureIds([cultureId], { [cultureId]: 1.0 });
  };

  // Toggle culture in mashup mode
  const handleToggleCultureInMashup = (cultureId: string) => {
    const isCurrentlyActive = activeCultureIds.includes(cultureId);

    if (isCurrentlyActive) {
      // Cannot deselect if it's the only remaining active culture
      if (activeCultureIds.length <= 1) {
        return;
      }
      const nextIds = activeCultureIds.filter((id) => id !== cultureId);
      const nextWeights = { ...cultureWeights };
      delete nextWeights[cultureId];
      setActiveCultureIds(nextIds, nextWeights);
    } else {
      const nextIds = [...activeCultureIds, cultureId];
      const nextWeights = {
        ...cultureWeights,
        [cultureId]: cultureWeights[cultureId] ?? 1.0,
      };
      setActiveCultureIds(nextIds, nextWeights);
    }
  };

  // Change weight of a culture
  const handleWeightChange = (cultureId: string, weight: number) => {
    const newWeights = {
      ...cultureWeights,
      [cultureId]: Math.round(weight * 100) / 100,
    };
    setActiveCultureIds(activeCultureIds, newWeights);
  };

  // Toggle linguistic trait drawer
  const toggleDetails = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDetailsId((prev) => (prev === id ? null : id));
  };

  if (isCollapsed) {
    return (
      <div className={cn('flex flex-col items-center gap-2 py-2', className)}>
        <button
          type="button"
          onClick={handleToggleMashupMode}
          title={`Culture Mashup: ${isMashupMode ? 'Enabled' : 'Disabled'}`}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
            isMashupMode
              ? 'pill-accent shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
          )}
        >
          <Globe className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 w-full items-center">
          {cultureList.map((c) => {
            const isActive = activeCultureIds.includes(c.id);
            const initials = c.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase();

            return (
              <button
                key={c.id}
                type="button"
                title={`${c.name} (${isActive ? 'Active' : 'Inactive'})`}
                onClick={() =>
                  isMashupMode
                    ? handleToggleCultureInMashup(c.id)
                    : handleSelectSingleCulture(c.id)
                }
                className={cn(
                  'w-8 h-8 rounded text-[11px] font-bold tracking-wider flex items-center justify-center transition-all',
                  isActive
                    ? 'pill-accent shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-charcoal-800/60'
                )}
              >
                {initials}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header with Mashup Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 theme-text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Origins & Cultures
          </span>
        </div>

        {/* Culture Mashup Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMashupMode}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border select-none',
            isMashupMode
              ? 'pill-accent shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.25)]'
              : 'bg-charcoal-800/80 text-slate-400 border-charcoal-700 hover:text-slate-200 hover:border-charcoal-600'
          )}
          title="Toggle Multi-Culture Mashup to blend phonetics from multiple cultures"
        >
          <Sparkles className={cn('w-3 h-3', isMashupMode ? 'theme-text-accent' : 'text-slate-400')} />
          <span>Mashup</span>
          <span
            className={cn(
              'ml-0.5 px-1 py-0.2 text-[9px] uppercase tracking-wider rounded font-bold',
              isMashupMode
                ? 'theme-bg-accent text-charcoal-950'
                : 'bg-charcoal-700 text-slate-400'
            )}
          >
            {isMashupMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {isMashupMode && (
        <div className="text-[11px] pill-accent-subtle rounded-lg p-2 leading-relaxed">
          <span className="font-semibold theme-text-accent">Culture Mashup Active:</span> Select multiple traditions and balance their lexical weights.
        </div>
      )}

      {/* Cultures List */}
      <div className="flex flex-col gap-2">
        {cultureList.map((culture: CultureProfile) => {
          const isActive = activeCultureIds.includes(culture.id);
          const isExpanded = expandedDetailsId === culture.id;
          const weight = cultureWeights[culture.id] ?? 1.0;

          return (
            <div
              key={culture.id}
              className={cn(
                'rounded-lg border transition-all duration-200 overflow-hidden',
                isActive
                  ? 'theme-active-item'
                  : 'bg-charcoal-850/50 border-charcoal-700/60 hover:border-charcoal-600'
              )}
            >
              {/* Main Culture Row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isMashupMode) {
                    handleToggleCultureInMashup(culture.id);
                  } else {
                    handleSelectSingleCulture(culture.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isMashupMode) {
                      handleToggleCultureInMashup(culture.id);
                    } else {
                      handleSelectSingleCulture(culture.id);
                    }
                  }
                }}
                className="flex items-center justify-between p-2.5 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0',
                      isMashupMode ? 'rounded' : 'rounded-full',
                      isActive
                        ? 'theme-bg-accent text-charcoal-950 font-bold'
                        : 'border border-charcoal-600 group-hover:border-slate-400'
                    )}
                  >
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-xs font-medium truncate',
                          isActive ? 'theme-text-accent font-semibold' : 'text-slate-300'
                        )}
                      >
                        {culture.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {culture.region}
                    </div>
                  </div>
                </div>

                {/* Linguistic Details Accordion Toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleDetails(culture.id, e)}
                  aria-label={`Toggle details for ${culture.name}`}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-charcoal-700 rounded transition-colors ml-1"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Weight Slider in Mashup Mode */}
              {isMashupMode && isActive && (
                <div className="px-3 pb-2.5 pt-1 border-t border-charcoal-700/60 bg-charcoal-900/40">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sliders className="w-3 h-3 theme-text-accent" />
                      Weight
                    </span>
                    <span className="font-mono theme-text-accent font-semibold">
                      {`${Math.round(weight * 100)}% (${weight.toFixed(1)}x)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={weight}
                    onChange={(e) =>
                      handleWeightChange(culture.id, parseFloat(e.target.value))
                    }
                    className="w-full h-1.5 bg-charcoal-700 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                    aria-label={`${culture.name} weight`}
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>Subtle (10%)</span>
                    <span>Standard (100%)</span>
                    <span>Dominant (200%)</span>
                  </div>
                </div>
              )}

              {/* Expandable Linguistic Details Drawer */}
              {isExpanded && (
                <div className="px-3 py-2.5 bg-charcoal-900/70 border-t border-charcoal-700/80 text-[11px] space-y-2">
                  <p className="text-slate-300 italic leading-relaxed">
                    {culture.description}
                  </p>

                  <div className="grid grid-cols-1 gap-1 text-[10px] pt-1 border-t border-charcoal-800">
                    <div>
                      <span className="text-slate-400">Historical Era: </span>
                      <span className="text-slate-300 font-medium">
                        {culture.historical_era}
                      </span>
                    </div>

                    {culture.phonetic_rules?.vowels && (
                      <div>
                        <span className="text-slate-400">Vowels: </span>
                        <span className="font-mono theme-text-accent">
                          {culture.phonetic_rules.vowels.join(' ')}
                        </span>
                      </div>
                    )}

                    {culture.phonetic_rules?.forbidden_clusters &&
                      culture.phonetic_rules.forbidden_clusters.length > 0 && (
                        <div>
                          <span className="text-slate-400">Forbidden Clusters: </span>
                          <span className="font-mono text-red-400">
                            {culture.phonetic_rules.forbidden_clusters.join(', ')}
                          </span>
                        </div>
                      )}

                    {culture.seeds?.honorific_titles &&
                      culture.seeds.honorific_titles.length > 0 && (
                        <div>
                          <span className="text-slate-400">Sample Titles: </span>
                          <span className="text-slate-300">
                            {culture.seeds.honorific_titles.slice(0, 4).join(', ')}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CultureSelector;
