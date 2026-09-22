import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Trash2,
  Search,
  X,
  ChevronLeft,
  Pin,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { normalizeEntityCategory } from '../../types/domain';
import type { LoreEntity } from '../../types/domain';
import { EntityNodeCard } from './EntityNodeCard';
import { cn } from '../../utils/cn';

export type CollectionsCategoryFilter =
  | 'all'
  | 'character'
  | 'settlement'
  | 'geography'
  | 'faction'
  | 'artifact';

export interface CollectionsViewProps {
  onBackToGrid?: () => void;
  onInspectTree?: (entity: LoreEntity) => void;
  onOpenExport?: () => void;
  className?: string;
}

const CATEGORY_TABS: Array<{ id: CollectionsCategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'People' },
  { id: 'settlement', label: 'Settlements' },
  { id: 'geography', label: 'Geography' },
  { id: 'faction', label: 'Factions' },
  { id: 'artifact', label: 'Artifacts' },
];

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onBackToGrid,
  onInspectTree,
  onOpenExport,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CollectionsCategoryFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

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
    <div
      data-testid="collections-view"
      className={cn('flex flex-col h-full w-full overflow-hidden bg-charcoal-950', className)}
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-charcoal-800 bg-charcoal-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Back to Grid Button */}
          {onBackToGrid && (
            <button
              type="button"
              data-testid="collections-back-to-grid-btn"
              aria-label="Back to Card Grid View"
              title="Back to Card Grid View"
              onClick={onBackToGrid}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-gold-400 bg-charcoal-900 hover:bg-charcoal-800 border border-charcoal-700 hover:border-gold-500/40 transition-colors shadow-sm select-none"
            >
              <ChevronLeft className="w-4 h-4 text-gold-400" />
              <span>Grid</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-100 font-serif">
              Collections
            </h2>
            <span
              data-testid="collections-count-badge"
              className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-400"
            >
              {pinnedEntities.length}
            </span>
          </div>
        </div>

        {/* Action Buttons: Export Hub Trigger & Clear All */}
        <div className="flex items-center gap-2">
          {onOpenExport && (
            <button
              type="button"
              data-testid="collections-export-btn"
              aria-label="Export Collections"
              title="Export Collections to Markdown, JSON, CSV, or Project Bible"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-charcoal-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 rounded-lg shadow-sm shadow-gold-500/20 transition-all active:scale-[0.98]"
            >
              <Download size={13} />
              <span>Export Collections</span>
            </button>
          )}

          {pinnedEntities.length > 0 && (
            <button
              type="button"
              data-testid="clear-pinned-btn"
              aria-label="Clear all collected items"
              title="Clear all collected entries"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-charcoal-800 border border-transparent hover:border-charcoal-700 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation Bar */}
      {showClearConfirm && (
        <div
          data-testid="clear-confirm-bar"
          className="flex items-center justify-between px-6 py-2.5 bg-rose-950/40 border-b border-rose-900/60 text-xs shrink-0 animate-in fade-in duration-150"
        >
          <span className="text-rose-300 font-medium">
            Clear all {pinnedEntities.length} items from Collections? This action cannot be undone.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="confirm-clear-btn"
              onClick={handleConfirmClear}
              className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
            >
              Clear All
            </button>
            <button
              type="button"
              data-testid="cancel-clear-btn"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-2.5 border-b border-charcoal-800/80 bg-charcoal-900/40 shrink-0">
        {/* Search Input */}
        <div className="relative flex items-center flex-1 max-w-md">
          <Search size={14} className="absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            data-testid="shelf-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections by name, culture, root, or meaning..."
            aria-label="Search Collections"
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-charcoal-900 border border-charcoal-750 focus:border-gold-500/50 rounded-lg text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              data-testid="clear-search-btn"
              aria-label="Clear search query"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-500 hover:text-slate-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div
          role="tablist"
          aria-label="Category filters"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
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
                'px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all border',
                categoryFilter === tab.id
                  ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {pinnedEntities.length === 0 ? (
          /* Empty State */
          <div
            data-testid="collections-empty-state"
            className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center rounded-2xl border-2 border-dashed border-charcoal-800 bg-charcoal-900/30 max-w-xl mx-auto my-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-300/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-4 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.1)]">
              <Pin className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-serif font-semibold text-slate-100 mb-2">
              Your Collections are empty
            </h3>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
              Click the pin icon on any generated name in the studio to collect it here.
              Organize dynastic hierarchies, settlement clusters, and realm landmarks.
            </p>

            {onBackToGrid && (
              <button
                type="button"
                data-testid="collections-go-generate-btn"
                onClick={onBackToGrid}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs tracking-wide bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 shadow-md shadow-gold-500/20 active:scale-[0.98] transition-all"
              >
                <span>Go to Generator Grid</span>
              </button>
            )}
          </div>
        ) : filteredEntities.length === 0 ? (
          /* Zero Search Results State */
          <div
            data-testid="collections-no-results-state"
            className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
          >
            <Search size={32} className="text-slate-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">
              No collected lore matches your filter
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No entities match &ldquo;{searchQuery || categoryFilter}&rdquo; in Collections.
            </p>
            <button
              type="button"
              data-testid="shelf-reset-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 rounded-lg transition-colors font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div
            data-testid="collections-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredEntities.map((entity) => (
              <EntityNodeCard
                key={entity.id}
                entity={entity}
                mode="grid"
                onInspectTree={onInspectTree}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsView;
