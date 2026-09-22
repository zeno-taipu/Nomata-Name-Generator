import React from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { normalizeEntityCategory } from '../../types/domain';
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

  // Normalize category to display icon and human-readable label
  const normalizedCat = normalizeEntityCategory(activeCategory);
  const catMeta = CATEGORY_META[normalizedCat] || { label: activeCategory, icon: Layers };
  const CategoryIcon = catMeta.icon;

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

      {/* Center: Active Category Indicator & Blended Culture Origin Badge */}
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

        {/* Culture Pill */}
        <div
          data-testid="header-culture-indicator"
          className="flex items-center gap-1 text-slate-400"
          title={`Active Cultures: ${cultureNames.join(', ')}`}
        >
          <span className="text-slate-500">Culture:</span>
          <span className="text-gold-400/90 font-medium truncate max-w-[200px]">
            {cultureDisplay}
          </span>
        </div>
      </div>

      {/* Right: Collections Toggle / Count Badge, Export Hub Trigger & Settings Cog */}
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
