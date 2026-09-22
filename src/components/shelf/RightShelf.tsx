import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Trash2,
  Search,
  X,
  Pin,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { normalizeEntityCategory } from '../../types/domain';
import type { LoreEntity } from '../../types/domain';
import { PinnedItemCard } from './PinnedItemCard';
import { ExportModal } from './ExportModal';
import { cn } from '../../utils/cn';

export type RightShelfCategoryFilter = 'all' | 'character' | 'settlement' | 'geography' | 'faction' | 'artifact';

export interface RightShelfProps {
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  onInspectTree?: (entity: LoreEntity) => void;
  isExportModalOpen?: boolean;
  onToggleExportModal?: (open: boolean) => void;
  className?: string;
}

const CATEGORY_TABS: Array<{ id: RightShelfCategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'People' },
  { id: 'settlement', label: 'Settlements' },
  { id: 'geography', label: 'Geography' },
  { id: 'faction', label: 'Factions' },
  { id: 'artifact', label: 'Artifacts' },
];

export const RightShelf: React.FC<RightShelfProps> = ({
  defaultCollapsed = false,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  onInspectTree,
  isExportModalOpen: controlledIsExportModalOpen,
  onToggleExportModal,
  className,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(defaultCollapsed);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<RightShelfCategoryFilter>('all');
  const [internalExportModalOpen, setInternalExportModalOpen] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const isCollapsed =
    controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const isExportModalOpen =
    controlledIsExportModalOpen !== undefined
      ? controlledIsExportModalOpen
      : internalExportModalOpen;

  const setExportModalOpen = (open: boolean) => {
    if (controlledIsExportModalOpen === undefined) {
      setInternalExportModalOpen(open);
    }
    onToggleExportModal?.(open);
  };

  const handleToggle = () => {
    const next = !isCollapsed;
    if (controlledIsCollapsed === undefined) {
      setInternalCollapsed(next);
    }
    if (onToggleCollapse) {
      onToggleCollapse(next);
    }
  };

  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const clearPinned = useNominaStore((s) => s.clearPinned);

  // Filter pinned entities in real-time by search query and category
  const filteredEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return pinnedEntities.filter((entity) => {
      // Category filter check
      if (categoryFilter !== 'all') {
        const normCat = normalizeEntityCategory(entity.category);
        if (normCat !== categoryFilter) {
          return false;
        }
      }

      // Search query check
      if (query) {
        const culture = getCultureById(entity.cultureId);
        const nameMatch = entity.name.toLowerCase().includes(query);
        const origMatch = (entity.originalName || '').toLowerCase().includes(query);
        const subtypeMatch = (entity.subtype || '').toLowerCase().includes(query);
        const categoryMatch = entity.category.toLowerCase().includes(query);
        const cultureIdMatch = entity.cultureId.toLowerCase().includes(query);
        const cultureNameMatch = (culture?.name || '').toLowerCase().includes(query);
        const meaningMatch = (entity.meaning || '').toLowerCase().includes(query);
        const rootMatch = (entity.rootName || entity.originalRoot || '').toLowerCase().includes(query);
        const tagMatch = entity.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;

        return (
          nameMatch ||
          origMatch ||
          subtypeMatch ||
          categoryMatch ||
          cultureIdMatch ||
          cultureNameMatch ||
          meaningMatch ||
          rootMatch ||
          tagMatch
        );
      }

      return true;
    });
  }, [pinnedEntities, categoryFilter, searchQuery]);

  const handleConfirmClear = () => {
    clearPinned();
    setShowClearConfirm(false);
  };

  return (
    <>
      <aside
        data-testid="right-shelf"
        aria-label="World Bible & Pinned Lore Shelf"
        className={cn(
          'relative flex flex-col h-full bg-charcoal-900 border-l border-charcoal-700/80 select-none transition-all duration-300 ease-in-out z-20',
          isCollapsed ? 'w-14 min-w-[3.5rem]' : 'w-80 min-w-[20rem] max-w-[20rem]',
          className
        )}
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--color-border)' }}
      >
        {/* Collapsed Vertical Bar View */}
        {isCollapsed ? (
          <div className="flex flex-col items-center py-6 h-full space-y-6">
            <button
              type="button"
              data-testid="collapsed-shelf-icon-btn"
              onClick={handleToggle}
              aria-label="Expand World Bible"
              title="Expand World Bible"
              className="p-2.5 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/30 hover:bg-gold-500/20 transition-colors"
            >
              <BookOpen size={18} />
            </button>

            {/* Pinned Count Pill */}
            <div
              data-testid="collapsed-pinned-count"
              title={`${pinnedEntities.length} pinned entities`}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-charcoal-800 border border-charcoal-700 text-xs font-mono font-semibold text-gold-400"
            >
              {pinnedEntities.length}
            </div>

            {/* Quick Export Button in Collapsed Mode */}
            <button
              type="button"
              data-testid="collapsed-export-btn"
              onClick={() => setExportModalOpen(true)}
              aria-label="Open Export Hub"
              title="Open Export Hub"
              className="p-2 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-charcoal-800 border border-transparent hover:border-charcoal-700 transition-colors"
            >
              <Download size={16} />
            </button>
          </div>
        ) : (
          /* Expanded Shelf Content */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header: Title, Count, Export, Clear */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-charcoal-800 bg-charcoal-950/40">
              <div className="flex items-center gap-2">
                <BookOpen className="text-gold-400" size={17} />
                <h3
                  id="right-shelf-title"
                  className="font-serif font-medium text-sm text-slate-100 tracking-wide"
                >
                  World Bible
                </h3>
                <span
                  data-testid="pinned-count-badge"
                  className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400"
                >
                  {pinnedEntities.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Export Button */}
                <button
                  type="button"
                  data-testid="open-export-modal-btn"
                  aria-label="Export World Bible"
                  title="Export entities or save project bible"
                  onClick={() => setExportModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 rounded-lg transition-colors"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>

                {/* Clear All Pinned Button */}
                {pinnedEntities.length > 0 && (
                  <button
                    type="button"
                    data-testid="clear-pinned-btn"
                    aria-label="Clear all pinned entities"
                    title="Clear all pinned entries"
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-charcoal-800 border border-transparent hover:border-charcoal-700 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Clear All Confirmation Bar */}
            {showClearConfirm && (
              <div
                data-testid="clear-confirm-bar"
                className="flex items-center justify-between px-4 py-2 bg-rose-950/40 border-b border-rose-900/60 text-xs"
              >
                <span className="text-rose-300">Clear all {pinnedEntities.length} pinned items?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="confirm-clear-btn"
                    onClick={handleConfirmClear}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    data-testid="cancel-clear-btn"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-0.5 rounded bg-charcoal-800 hover:bg-charcoal-700 text-slate-300 text-[11px] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Search Input Bar */}
            <div className="p-3 border-b border-charcoal-800 bg-charcoal-900/60">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  data-testid="shelf-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pinned lore..."
                  aria-label="Search pinned lore"
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-charcoal-950 border border-charcoal-800 focus:border-gold-500/50 rounded-lg text-slate-200 placeholder-slate-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    data-testid="clear-search-btn"
                    aria-label="Clear search query"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-500 hover:text-slate-300"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div
                role="tablist"
                aria-label="Category filters"
                className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5 no-scrollbar"
              >
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    data-testid={`category-filter-${tab.id}`}
                    aria-selected={categoryFilter === tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={cn(
                      'px-2 py-0.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-all border',
                      categoryFilter === tab.id
                        ? 'bg-gold-500/20 text-gold-300 border-gold-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border-transparent'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Pinned Item List / Empty States */}
            <div
              data-testid="pinned-items-container"
              className="flex-1 overflow-y-auto p-3 space-y-2.5"
            >
              {pinnedEntities.length === 0 ? (
                /* Primary Empty State */
                <div
                  data-testid="shelf-empty-state"
                  className="flex flex-col items-center justify-center h-64 text-center px-4 space-y-3"
                >
                  <div className="p-3.5 rounded-2xl bg-charcoal-800/80 border border-charcoal-700/70 text-slate-500">
                    <Pin size={24} className="text-gold-400/80" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 font-serif">
                      Your World Bible is empty
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-[210px]">
                      Click the pin icon on any generated name in the studio to collect it here.
                    </p>
                  </div>
                </div>
              ) : filteredEntities.length === 0 ? (
                /* Search / Filter Zero Results State */
                <div
                  data-testid="shelf-no-results-state"
                  className="flex flex-col items-center justify-center h-48 text-center px-4 space-y-2.5"
                >
                  <Search size={22} className="text-slate-600" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300">
                      No pinned lore matches
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                      &ldquo;{searchQuery || categoryFilter}&rdquo;
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="shelf-reset-filters-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="px-2.5 py-1 text-xs text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 rounded-md transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                /* Render Filtered PinnedItemCards */
                filteredEntities.map((entity) => (
                  <PinnedItemCard
                    key={entity.id}
                    entity={entity}
                    onInspectTree={onInspectTree}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Export Modal Dialog */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </>
  );
};
