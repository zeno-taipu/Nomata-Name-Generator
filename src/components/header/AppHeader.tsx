import React from 'react';
import {
  Compass,
  PanelLeft,
  PanelRight,
  Download,
  BookOpen,
  Settings,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
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
  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);

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
              ? 'text-slate-400 bg-charcoal-900 border-charcoal-700 hover:theme-text-accent hover:border-charcoal-600'
              : 'pill-accent'
          )}
        >
          <PanelLeft size={16} />
        </button>

        {/* Logo Icon and Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg pill-accent shadow-sm">
            <Compass size={18} className="theme-text-accent animate-pulse" style={{ animationDuration: '3s' }} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                data-testid="header-title"
                className="text-sm font-bold tracking-widest theme-text-accent font-serif"
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

      {/* Right: Collections Toggle, Export Hub & Settings Cog */}
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
              ? 'pill-accent shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.2)]'
              : 'bg-charcoal-900 border-charcoal-750 text-slate-300 hover:theme-border-accent hover:theme-text-accent'
          )}
        >
          <BookOpen size={14} className="theme-text-accent" />
          <span className="hidden sm:inline text-slate-400">Collections:</span>
          <span
            data-testid="header-collections-count"
            className="font-mono font-semibold theme-text-accent"
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
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg btn-accent-primary"
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
          className="group p-1.5 rounded-lg border border-charcoal-750 bg-charcoal-900 text-slate-300 hover:theme-text-accent hover:theme-border-accent transition-colors"
        >
          <Settings size={15} className="group-hover:rotate-45 transition-transform duration-200" />
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
                ? 'text-slate-400 bg-charcoal-900 border-charcoal-700 hover:theme-text-accent hover:theme-border-accent'
                : 'pill-accent'
            )}
          >
            <PanelRight size={16} />
          </button>
        )}
      </div>
    </header>
  );
};

