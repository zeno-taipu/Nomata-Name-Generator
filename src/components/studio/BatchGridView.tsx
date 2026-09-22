import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Pin,
  RefreshCw,
  Trash2,
  Layers,
  ArrowRight,
  User,
  Castle,
  Mountain,
  Shield,
  Languages,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { normalizeEntityCategory } from '../../types/domain';
import { getCultureById } from '../../data/cultures';
import { SUBTYPES_BY_CATEGORY } from '../sidebar/GeneratorDrawer';
import { useNominaStore } from '../../store/useNominaStore';
import { EntityNodeCard } from './EntityNodeCard';
import { cn } from '../../utils/cn';

export interface BatchGridViewProps {
  onInspectTree?: (entity: LoreEntity) => void;
  className?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  character: { label: 'Characters & People', icon: User },
  settlement: { label: 'Settlements & Cities', icon: Castle },
  geography: { label: 'Geography & Landmarks', icon: Mountain },
  faction: { label: 'Factions & Guilds', icon: Shield },
  artifact: { label: 'Artifacts & Relics', icon: Sparkles },
};

export const BatchGridView: React.FC<BatchGridViewProps> = ({
  onInspectTree,
  className,
}) => {
  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const activeCategory = useNominaStore((s) => s.activeCategory);
  const activeCultureIds = useNominaStore((s) => s.activeCultureIds);
  const targetSubtype = useNominaStore((s) => s.targetSubtype);
  const setEngineConfig = useNominaStore((s) => s.setEngineConfig);
  const anglicize = useNominaStore((s) => s.anglicize);
  const anglicizeMode = useNominaStore((s) => s.anglicizeMode);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);
  const setAnglicizationConfig = useNominaStore((s) => s.setAnglicizationConfig);
  const globalAnglicize = useNominaStore((s) => s.globalAnglicize);
  const clearBatch = useNominaStore((s) => s.clearBatch);
  const generateBatch = useNominaStore((s) => s.generateBatch);
  const pinAllBatch = useNominaStore((s) => s.pinAllBatch);
  const reRollBatch = useNominaStore((s) => s.reRollBatch);
  const isGenerating = useNominaStore((s) => s.isGenerating);
  const activeEntityId = useNominaStore((s) => s.activeEntityId);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);

  const [isAnglicizeOpen, setIsAnglicizeOpen] = useState<boolean>(false);
  const anglicizeRef = useRef<HTMLDivElement>(null);

  // Close Anglicize modal on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (anglicizeRef.current && !anglicizeRef.current.contains(e.target as Node)) {
        setIsAnglicizeOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAnglicizeOpen(false);
      }
    };
    if (isAnglicizeOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnglicizeOpen]);

  // Derived category & subtype lookups
  const normalizedCat = normalizeEntityCategory(activeCategory);
  const catMeta = CATEGORY_META[normalizedCat] || { label: activeCategory, icon: Layers };
  const CategoryIcon = catMeta.icon;
  const availableSubtypes = SUBTYPES_BY_CATEGORY[normalizedCat] || ['auto'];

  // Active cultures display string
  const cultureNames = activeCultureIds
    .map((id) => getCultureById(id)?.name || id)
    .filter(Boolean);

  const cultureDisplay =
    cultureNames.length === 0
      ? 'No Culture Selected'
      : cultureNames.length <= 2
      ? cultureNames.join(' + ')
      : `${cultureNames[0]} + ${cultureNames.length - 1} more`;

  // Determine Anglicized toggle status for Collections and Batch
  const isCollectionsAnglicized =
    pinnedEntities.length > 0 && pinnedEntities.every((e) => e.anglicization?.enabled);
  const isBatchAnglicized =
    generatedBatch.length > 0 && generatedBatch.every((e) => e.anglicization?.enabled);

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
      {/* Second Header Bar (Generated Entities Title & Full Status Bar with Type & Anglicize) */}
      <div
        data-testid="batch-header-bar"
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-charcoal-800 bg-charcoal-950/60 backdrop-blur-sm shrink-0"
      >
        {/* Left: Generated Entities Title & Count */}
        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-4 h-4 theme-text-accent" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 font-serif">
            Generated Entities
          </h2>
          <span
            data-testid="batch-count-badge"
            className="text-xs font-mono px-2 py-0.5 rounded-full pill-accent font-semibold"
          >
            {generatedBatch.length}
          </span>
        </div>

        {/* Center: The Entire Status Bar (Category • Subtype • Culture + Anglicize Icon) */}
        <div
          data-testid="grid-status-bar"
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-900 border border-charcoal-800 text-xs shadow-inner"
        >
          {/* Category Pill */}
          <div
            data-testid="header-category-indicator"
            data-testid-alias="grid-category-indicator"
            className="flex items-center gap-1.5 font-medium text-slate-200"
          >
            <CategoryIcon size={14} className="theme-text-accent" />
            <span className="hidden sm:inline">{catMeta.label}</span>
          </div>

          <span className="text-charcoal-700 select-none">•</span>

          {/* Target Subtype Selector */}
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500 hidden xl:inline">Subtype:</span>
            <select
              id="target-subtype-select"
              data-testid="target-subtype-select"
              data-testid-alias="header-target-subtype-select"
              value={targetSubtype}
              onChange={(e) => setEngineConfig({ targetSubtype: e.target.value })}
              className="bg-charcoal-800/90 text-xs theme-text-accent border border-charcoal-700/80 rounded-md px-2 py-0.5 focus:outline-none focus:theme-border-accent cursor-pointer font-medium hover:theme-border-accent transition-colors"
              title="Filter generation to a specific subtype or 'auto'"
            >
              {availableSubtypes.map((sub) => (
                <option key={sub} value={sub} className="bg-charcoal-900 text-slate-200">
                  {sub === 'auto' ? 'Auto Subtype' : sub}
                </option>
              ))}
            </select>
          </div>

          <span className="text-charcoal-700 select-none">•</span>

          {/* Culture Pill */}
          <div
            data-testid="header-culture-indicator"
            data-testid-alias="grid-culture-indicator"
            className="flex items-center gap-1 text-slate-400"
            title={`Active Cultures: ${cultureNames.join(', ')}`}
          >
            <span className="text-slate-500 hidden xl:inline">Culture:</span>
            <span className="theme-text-accent font-medium truncate max-w-[130px]">
              {cultureDisplay}
            </span>
          </div>

          <span className="text-charcoal-700 select-none">•</span>

          {/* Anglicize Icon Button & Togglable Popover Modal */}
          <div className="relative" ref={anglicizeRef}>
            <button
              type="button"
              data-testid="header-anglicize-btn"
              data-testid-alias="grid-anglicize-btn"
              aria-label="Anglicization Options"
              title="Anglicization Options (Mode, Dual Display, Toggle Collections/Batch)"
              onClick={() => setIsAnglicizeOpen((prev) => !prev)}
              className={cn(
                'p-1 rounded-md border transition-colors relative flex items-center justify-center',
                isAnglicizeOpen
                  ? 'pill-accent shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.25)]'
                  : 'bg-charcoal-800/80 text-slate-300 border-charcoal-700 hover:theme-text-accent hover:theme-border-accent'
              )}
            >
              <Languages size={13} className="theme-text-accent" />
              {(isBatchAnglicized || isCollectionsAnglicized || anglicize) && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
              )}
            </button>

            {/* Anglicize Options Modal */}
            {isAnglicizeOpen && (
              <div
                data-testid="header-anglicize-modal"
                data-testid-alias="grid-anglicize-modal"
                className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 p-4 rounded-xl bg-charcoal-900 border border-charcoal-700 shadow-2xl backdrop-blur-md z-50 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150"
                style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--color-border)' }}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-charcoal-800 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Languages className="w-4 h-4 theme-text-accent" />
                    <span>Anglicization Options</span>
                  </div>
                  <button
                    type="button"
                    data-testid="header-anglicize-close-btn"
                    onClick={() => setIsAnglicizeOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
                    aria-label="Close Anglicization options"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Mode Selectors */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-400 block">
                    Anglicization Mode
                  </label>
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
                          data-testid={`anglicize-mode-${m.id}`}
                          onClick={() => setAnglicizationConfig({ anglicizeMode: m.id })}
                          className={cn(
                            'py-1 text-xs rounded border text-center transition-colors font-medium',
                            isActive
                              ? 'pill-accent font-semibold shadow-sm'
                              : 'bg-charcoal-800 border-charcoal-700 text-slate-400 hover:text-slate-200 hover:bg-charcoal-750'
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
                    data-testid="dual-display-toggle"
                    onClick={() =>
                      setAnglicizationConfig({ exonymDualDisplay: !exonymDualDisplay })
                    }
                    className={cn(
                      'px-2.5 py-0.5 text-xs font-mono rounded border transition-colors',
                      exonymDualDisplay
                        ? 'pill-accent font-semibold'
                        : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200'
                    )}
                  >
                    {exonymDualDisplay ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Individual Card Helper Note */}
                <p className="mt-3 text-[11px] text-slate-400 leading-relaxed bg-charcoal-950/60 p-2 rounded-lg border border-charcoal-800">
                  Click the <Languages className="w-3 h-3 theme-text-accent inline mx-0.5 -mt-0.5" /> icon on any card to anglicize or revert individually.
                </p>

                {/* Togglable Global Actions */}
                <div className="mt-3 pt-2.5 border-t border-charcoal-800 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Toggle Anglicization
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Collections Toggle Button */}
                    <button
                      type="button"
                      data-testid="global-anglicize-collections-btn"
                      onClick={() => globalAnglicize('pinned', !isCollectionsAnglicized)}
                      className={cn(
                        'flex-1 flex items-center justify-between px-2.5 py-1.5 text-xs rounded border transition-all font-medium',
                        isCollectionsAnglicized
                          ? 'pill-accent shadow-sm'
                          : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200 hover:bg-charcoal-750'
                      )}
                      title={
                        isCollectionsAnglicized
                          ? 'Revert Collections to authentic historical orthography'
                          : 'Anglicize all entities in Collections'
                      }
                    >
                      <span>Collections</span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                          isCollectionsAnglicized
                            ? 'theme-bg-accent text-charcoal-950 font-bold'
                            : 'bg-charcoal-900 text-slate-500 border border-charcoal-750'
                        )}
                      >
                        {isCollectionsAnglicized ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    {/* Batch Toggle Button */}
                    <button
                      type="button"
                      data-testid="global-anglicize-all-btn"
                      data-testid-alias="anglicize-toggle"
                      onClick={() => globalAnglicize('batch', !isBatchAnglicized)}
                      className={cn(
                        'flex-1 flex items-center justify-between px-2.5 py-1.5 text-xs rounded border transition-all font-medium',
                        isBatchAnglicized
                          ? 'pill-accent shadow-sm'
                          : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200 hover:bg-charcoal-750'
                      )}
                      title={
                        isBatchAnglicized
                          ? 'Revert current Batch to authentic historical orthography'
                          : 'Anglicize all entities in current Batch'
                      }
                    >
                      <span>Batch</span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                          isBatchAnglicized
                            ? 'theme-bg-accent text-charcoal-950 font-bold'
                            : 'bg-charcoal-900 text-slate-500 border border-charcoal-750'
                        )}
                      >
                        {isBatchAnglicized ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Batch Header Quick Actions */}
        {generatedBatch.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Pin All */}
            <button
              type="button"
              data-testid="pin-all-button"
              onClick={handlePinAll}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                allPinned
                  ? 'pill-accent'
                  : 'bg-charcoal-900 border-charcoal-700/80 text-slate-300 hover:theme-text-accent hover:theme-border-accent'
              )}
              title="Pin all entities in current batch to World Bible"
            >
              <Pin className={cn('w-3.5 h-3.5', allPinned && 'theme-text-accent fill-current')} />
              <span>{allPinned ? 'All Pinned' : 'Pin All'}</span>
            </button>

            {/* Re-roll All */}
            <button
              type="button"
              data-testid="reroll-all-button"
              onClick={handleReRollAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-charcoal-900 border border-charcoal-700/80 text-slate-300 hover:theme-text-accent hover:theme-border-accent transition-colors"
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm btn-accent-primary"
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
