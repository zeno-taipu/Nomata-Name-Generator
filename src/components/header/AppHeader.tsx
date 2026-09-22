import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  PanelLeft,
  PanelRight,
  Download,
  BookOpen,
  User,
  Castle,
  Mountain,
  Shield,
  Sparkles,
  Layers,
  Settings,
  Languages,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { normalizeEntityCategory } from '../../types/domain';
import { SUBTYPES_BY_CATEGORY } from '../sidebar/GeneratorDrawer';
import { cn } from '../../utils/cn';

export interface AppHeaderProps {
  leftSidebarCollapsed?: boolean;
  rightShelfCollapsed?: boolean;
  isLeftSidebarCollapsed?: boolean;
  isRightShelfCollapsed?: boolean;
  isCollectionsView?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightShelf?: () => void;
  onToggleCollections?: () => void;
  onOpenExport?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  character: { label: 'Characters & People', icon: User },
  settlement: { label: 'Settlements & Cities', icon: Castle },
  geography: { label: 'Geography & Landmarks', icon: Mountain },
  faction: { label: 'Factions & Guilds', icon: Shield },
  artifact: { label: 'Artifacts & Relics', icon: Sparkles },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  leftSidebarCollapsed,
  rightShelfCollapsed,
  isLeftSidebarCollapsed,
  isRightShelfCollapsed,
  isCollectionsView,
  onToggleLeftSidebar,
  onToggleRightShelf,
  onToggleCollections,
  onOpenExport,
  onOpenSettings,
  className,
}) => {
  const leftCollapsed = isLeftSidebarCollapsed ?? leftSidebarCollapsed ?? false;
  const rightCollapsed = isRightShelfCollapsed ?? rightShelfCollapsed ?? false;
  const activeCategory = useNominaStore((s) => s.activeCategory);
  const activeCultureIds = useNominaStore((s) => s.activeCultureIds);
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const targetSubtype = useNominaStore((s) => s.targetSubtype);
  const setEngineConfig = useNominaStore((s) => s.setEngineConfig);
  const anglicize = useNominaStore((s) => s.anglicize);
  const anglicizeMode = useNominaStore((s) => s.anglicizeMode);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);
  const setAnglicizationConfig = useNominaStore((s) => s.setAnglicizationConfig);
  const globalAnglicize = useNominaStore((s) => s.globalAnglicize);

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

  // Normalize category to display icon and human-readable label
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

  return (
    <header
      data-testid="app-header"
      role="banner"
      className={cn(
        'relative flex items-center justify-between px-4 h-14 bg-charcoal-950 border-b border-charcoal-800 select-none z-30',
        className
      )}
      style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--color-border)' }}
    >
      {/* Left: Sidebar Collapse Toggle + Logo & Nomina Branding */}
      <div className="flex items-center gap-3">
        {/* Left Sidebar Toggle Button */}
        <button
          type="button"
          data-testid="header-toggle-left-sidebar"
          aria-label={leftCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          title={leftCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
          onClick={onToggleLeftSidebar}
          className={cn(
            'p-1.5 rounded-lg border transition-colors',
            leftCollapsed
              ? 'text-slate-400 bg-charcoal-900 border-charcoal-700 hover:text-gold-400 hover:border-gold-500/40'
              : 'text-gold-400 bg-gold-500/10 border-gold-500/30 hover:bg-gold-500/20'
          )}
        >
          <PanelLeft size={16} />
        </button>

        {/* Logo Icon and Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-400 shadow-sm shadow-gold-500/10">
            <Compass size={18} className="animate-pulse" style={{ animationDuration: '3s' }} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                data-testid="header-title"
                className="text-sm font-bold tracking-widest text-gold-400 font-serif"
              >
                NOMATA
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-charcoal-800 border border-charcoal-700 text-slate-400">
                v0.1.0
              </span>
            </div>
            <span
              data-testid="header-subtitle"
              className="text-[10px] text-slate-500 tracking-tight hidden sm:inline"
            >
              Desktop Lore &amp; Name Studio
            </span>
          </div>
        </div>
      </div>

      {/* Center: Active Category Indicator, Target Subtype & Culture Origin Badge */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-900 border border-charcoal-800 text-xs">
        {/* Category Pill */}
        <div
          data-testid="header-category-indicator"
          className="flex items-center gap-1.5 font-medium text-slate-200"
        >
          <CategoryIcon size={14} className="text-gold-400" />
          <span>{catMeta.label}</span>
        </div>

        <span className="text-charcoal-700 select-none">•</span>

        {/* Target Subtype Selector */}
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-slate-500 hidden lg:inline">Subtype:</span>
          <select
            id="target-subtype-select"
            data-testid="target-subtype-select"
            data-testid-alias="header-target-subtype-select"
            value={targetSubtype}
            onChange={(e) => setEngineConfig({ targetSubtype: e.target.value })}
            className="bg-charcoal-800/90 text-xs text-gold-400 border border-charcoal-700/80 rounded-md px-2 py-0.5 focus:outline-none focus:border-gold-500/50 cursor-pointer font-medium hover:border-gold-500/30 transition-colors"
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
          className="flex items-center gap-1 text-slate-400"
          title={`Active Cultures: ${cultureNames.join(', ')}`}
        >
          <span className="text-slate-500">Culture:</span>
          <span className="text-gold-400/90 font-medium truncate max-w-[150px]">
            {cultureDisplay}
          </span>
        </div>
      </div>

      {/* Right: Collections Toggle, Export Hub, Anglicization Modal Trigger & Settings Cog */}
      <div className="flex items-center gap-2">
        {/* Collections View Toggle / Count Button */}
        <button
          type="button"
          data-testid="header-collections-btn"
          data-testid-alias="header-bible-count-btn"
          aria-label={`Collections: ${pinnedEntities.length} saved lore items`}
          title={isCollectionsView ? 'Return to Generator Grid' : 'View Collections'}
          onClick={onToggleCollections || onToggleRightShelf}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all select-none',
            isCollectionsView
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300 shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.2)]'
              : 'bg-charcoal-900 border-charcoal-750 text-slate-300 hover:border-gold-500/40 hover:text-gold-400'
          )}
        >
          <BookOpen size={14} className="text-gold-400" />
          <span className="hidden sm:inline text-slate-400">Collections:</span>
          <span
            data-testid="header-collections-count"
            className="font-mono font-semibold text-gold-400"
          >
            <span data-testid="header-bible-count">{pinnedEntities.length}</span>
          </span>
        </button>

        {/* Quick Export Hub Button */}
        <button
          type="button"
          data-testid="header-export-btn"
          aria-label="Open Export Hub"
          title="Open Export Hub"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-charcoal-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 rounded-lg shadow-sm shadow-gold-500/10 transition-all active:scale-[0.98]"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Anglicization Options Icon & Popover Modal */}
        <div className="relative" ref={anglicizeRef}>
          <button
            type="button"
            data-testid="header-anglicize-btn"
            aria-label="Anglicization Options"
            title="Anglicization Options (Configure phonetic smoothing, suffixes, exonym dual display, and global actions)"
            onClick={() => setIsAnglicizeOpen((prev) => !prev)}
            className={cn(
              'p-1.5 rounded-lg border transition-colors relative',
              isAnglicizeOpen
                ? 'bg-gold-500/20 text-gold-400 border-gold-500/50 shadow-[0_0_8px_rgba(208,185,51,0.2)]'
                : 'bg-charcoal-900 text-slate-300 border-charcoal-750 hover:text-gold-400 hover:border-gold-500/40'
            )}
          >
            <Languages size={15} className="text-gold-400" />
            {anglicize && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            )}
          </button>

          {/* Anglicize Options Modal / Popover */}
          {isAnglicizeOpen && (
            <div
              data-testid="header-anglicize-modal"
              className="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl bg-charcoal-900 border border-charcoal-700 shadow-2xl backdrop-blur-md z-50 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150"
              style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--color-border)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-charcoal-800 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Languages className="w-4 h-4 text-gold-400" />
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
                            ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-sm'
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
                      ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                      : 'bg-charcoal-800 text-slate-400 border-charcoal-700 hover:text-slate-200'
                  )}
                >
                  {exonymDualDisplay ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Helper Note for Card Language Icon */}
              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed bg-charcoal-950/60 p-2 rounded-lg border border-charcoal-800">
                Click the <Languages className="w-3 h-3 text-gold-400 inline mx-0.5 -mt-0.5" /> icon on any card to anglicize or revert that card individually.
              </p>

              {/* Global Anglicize Section */}
              <div className="mt-3 pt-2.5 border-t border-charcoal-800 space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Global Actions
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="global-anglicize-collections-btn"
                    onClick={() => globalAnglicize('pinned')}
                    className="flex-1 py-1.5 px-2 text-[11px] rounded bg-gold-500/15 hover:bg-gold-500/25 text-gold-400 border border-gold-500/40 transition-colors font-medium text-center shadow-sm"
                    title="Anglicize all entities in Collections"
                  >
                    Anglicize Collections
                  </button>
                  <button
                    type="button"
                    data-testid="global-anglicize-all-btn"
                    data-testid-alias="anglicize-toggle"
                    onClick={() => globalAnglicize('all')}
                    className="flex-1 py-1.5 px-2 text-[11px] rounded bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 border border-charcoal-700 transition-colors font-medium text-center"
                    title="Anglicize all entities currently loaded (batch & collections)"
                  >
                    Anglicize All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Cog Button */}
        <button
          type="button"
          data-testid="header-settings-btn"
          aria-label="Settings & Appearance"
          title="Settings & Appearance (Cmd+,)"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg border border-charcoal-750 bg-charcoal-900 text-slate-300 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
        >
          <Settings size={15} />
        </button>

        {/* Right Shelf Toggle Button (only rendered if onToggleRightShelf is provided) */}
        {onToggleRightShelf && (
          <button
            type="button"
            data-testid="header-toggle-right-shelf"
            aria-label={rightCollapsed ? 'Expand right shelf' : 'Collapse right shelf'}
            title={rightCollapsed ? 'Expand right shelf' : 'Collapse right shelf'}
            onClick={onToggleRightShelf}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              rightCollapsed
                ? 'text-slate-400 bg-charcoal-900 border-charcoal-700 hover:text-gold-400 hover:border-gold-500/40'
                : 'text-gold-400 bg-gold-500/10 border-gold-500/30 hover:bg-gold-500/20'
            )}
          >
            <PanelRight size={16} />
          </button>
        )}
      </div>
    </header>
  );
};

