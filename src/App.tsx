import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from './components/header';
import { LeftSidebar } from './components/sidebar';
import { CenterStudio } from './components/studio';
import { ExportModal } from './components/shelf';
import { SettingsModal } from './components/settings';
import { useNominaStore } from './store/useNominaStore';
import { applyThemeToDOM } from './utils/theme';
import { usePersistenceStatus } from './store/persistenceStatus';

export interface DesktopShortcutActions {
  toggleExportModal: () => void;
  toggleSettingsModal: () => void;
  toggleLeftSidebar: () => void;
  toggleRightShelf?: () => void;
  toggleCollections?: () => void;
}

export function handleDesktopShortcuts(
  e: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    target?: EventTarget | null;
    preventDefault?: () => void;
  },
  actions: DesktopShortcutActions
): boolean {
  const isModifier = Boolean(e.metaKey || e.ctrlKey);
  if (!isModifier || e.shiftKey || e.altKey) return false;

  const target = e.target as HTMLElement | null;
  if (target?.closest?.('[role="dialog"]')) return false;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (typeof target.isContentEditable === 'boolean' && target.isContentEditable))
  ) {
    return false;
  }

  const key = e.key.toLowerCase();
  if (key === 'e') {
    e.preventDefault?.();
    actions.toggleExportModal();
    return true;
  } else if (key === 'b') {
    e.preventDefault?.();
    actions.toggleLeftSidebar();
    return true;
  } else if (key === 'j') {
    e.preventDefault?.();
    if (actions.toggleCollections) {
      actions.toggleCollections();
    } else if (actions.toggleRightShelf) {
      actions.toggleRightShelf();
    }
    return true;
  } else if (e.key === ',') {
    e.preventDefault?.();
    actions.toggleSettingsModal();
    return true;
  }
  return false;
}

export const App: React.FC = () => {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [centerViewMode, setCenterViewMode] = useState<'grid' | 'tree' | 'collections'>('grid');

  const themeSettings = useNominaStore((s) => s.themeSettings);
  const { error: persistenceError } = usePersistenceStatus();

  // Initialize and synchronize dynamic CSS theme variables on document root
  useEffect(() => {
    applyThemeToDOM(themeSettings);
  }, [themeSettings]);

  const handleToggleCollections = useCallback(() => {
    setCenterViewMode((prev) => (prev === 'collections' ? 'grid' : 'collections'));
  }, []);

  // Global desktop keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      handleDesktopShortcuts(e, {
        toggleExportModal: () => setIsExportModalOpen((prev) => !prev),
        toggleSettingsModal: () => setIsSettingsModalOpen((prev) => !prev),
        toggleLeftSidebar: () => setIsLeftSidebarCollapsed((prev) => !prev),
        toggleCollections: handleToggleCollections,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleToggleCollections]);

  return (
    <div
      data-testid="app-shell"
      className="h-screen w-screen overflow-hidden flex flex-col bg-charcoal-950 text-slate-100 font-sans"
    >
      {/* Top Header */}
      <AppHeader
        isLeftSidebarCollapsed={isLeftSidebarCollapsed}
        leftSidebarCollapsed={isLeftSidebarCollapsed}
        onToggleLeftSidebar={() => setIsLeftSidebarCollapsed((prev) => !prev)}
        isCollectionsView={centerViewMode === 'collections'}
        onToggleCollections={handleToggleCollections}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {persistenceError && (
        <div role="alert" className="flex items-center justify-between gap-4 px-5 py-3 bg-amber-950 text-amber-100 border-b border-amber-700 text-sm">
          <div>
            <strong>Changes may be unsaved.</strong>{' '}
            {persistenceError} Export a project backup before closing the app.
          </div>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="shrink-0 rounded-lg px-3 py-1.5 border border-amber-400 hover:bg-amber-900 focus-visible:outline focus-visible:outline-2"
          >
            Open Export Hub
          </button>
        </div>
      )}

      {/* Main 2-Column Studio Body */}
      <div
        data-testid="studio-body"
        className="flex-1 flex overflow-hidden relative"
      >
        {/* Left Column: Categories, Cultures & Overrides */}
        <LeftSidebar
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={setIsLeftSidebarCollapsed}
        />

        {/* Center/Main Column: Batch Grid Viewport, Lineage Tree & Collections */}
        <CenterStudio
          className="flex-1 min-w-0 h-full overflow-hidden"
          viewMode={centerViewMode}
          onViewModeChange={setCenterViewMode}
          onOpenExport={() => setIsExportModalOpen(true)}
        />
      </div>

      {/* Export Hub Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Settings Modal (Appearance, Data Import, Presets) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default App;
