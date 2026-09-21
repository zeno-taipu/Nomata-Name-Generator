import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from './components/header';
import { LeftSidebar } from './components/sidebar';
import { CenterStudio } from './components/studio';
import { RightShelf } from './components/shelf';
import { useNominaStore } from './store/useNominaStore';
import type { LoreEntity } from './types/domain';

export interface DesktopShortcutActions {
  toggleExportModal: () => void;
  toggleLeftSidebar: () => void;
  toggleRightShelf: () => void;
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
    actions.toggleRightShelf();
    return true;
  }
  return false;
}

export const App: React.FC = () => {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isRightShelfCollapsed, setIsRightShelfCollapsed] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [centerViewMode, setCenterViewMode] = useState<'grid' | 'tree'>('grid');

  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);

  // Global desktop keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      handleDesktopShortcuts(e, {
        toggleExportModal: () => setIsExportModalOpen((prev) => !prev),
        toggleLeftSidebar: () => setIsLeftSidebarCollapsed((prev) => !prev),
        toggleRightShelf: () => setIsRightShelfCollapsed((prev) => !prev),
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleInspectTree = useCallback(
    (entity: LoreEntity) => {
      setActiveEntityId(entity.id);
      setCenterViewMode('tree');
    },
    [setActiveEntityId]
  );

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
        isRightShelfCollapsed={isRightShelfCollapsed}
        rightShelfCollapsed={isRightShelfCollapsed}
        onToggleRightShelf={() => setIsRightShelfCollapsed((prev) => !prev)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main 3-Column Studio Body */}
      <div
        data-testid="studio-body"
        className="flex-1 flex overflow-hidden relative"
      >
        {/* Left Column: Categories, Cultures & Overrides */}
        <LeftSidebar
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={setIsLeftSidebarCollapsed}
        />

        {/* Center Column: Controls, Batch Grid Viewport & Lineage Tree */}
        <CenterStudio
          className="flex-1 min-w-0 h-full overflow-hidden"
          viewMode={centerViewMode}
          onViewModeChange={setCenterViewMode}
        />

        {/* Right Column: World Bible Shelf & Export Modal */}
        <RightShelf
          isCollapsed={isRightShelfCollapsed}
          onToggleCollapse={setIsRightShelfCollapsed}
          isExportModalOpen={isExportModalOpen}
          onToggleExportModal={setIsExportModalOpen}
          onInspectTree={handleInspectTree}
        />
      </div>
    </div>
  );
};

export default App;
