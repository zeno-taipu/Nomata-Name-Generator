import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Sliders,
  Layers,
} from 'lucide-react';
import { CategoryNav } from './CategoryNav';
import { CultureSelector } from './CultureSelector';
import { CustomVocabularyModal } from './CustomVocabularyModal';
import { useNominaStore } from '../../store/useNominaStore';
import { cn } from '../../utils/cn';

export interface LeftSidebarProps {
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  defaultCollapsed = false,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  className,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(defaultCollapsed);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState<boolean>(false);

  const isCollapsed =
    controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    const next = !isCollapsed;
    if (controlledIsCollapsed === undefined) {
      setInternalCollapsed(next);
    }
    if (onToggleCollapse) {
      onToggleCollapse(next);
    }
  };

  const customVocabulary = useNominaStore((state) => state.customVocabulary);
  const activeCultureIds = useNominaStore((state) => state.activeCultureIds);

  const customItemsCount =
    (customVocabulary.honorifics?.length ?? 0) +
    (customVocabulary.customPrefixes?.length ?? 0) +
    (customVocabulary.customSuffixes?.length ?? 0) +
    (customVocabulary.customSeeds?.settlement_roots?.length ?? 0) +
    (customVocabulary.customSeeds?.epithets?.length ?? 0);

  return (
    <>
      <aside
        data-testid="left-sidebar"
        aria-label="Main Navigation & Origins Sidebar"
        className={cn(
          'relative flex flex-col h-full bg-charcoal-900 border-r border-charcoal-700/80 select-none transition-all duration-300 ease-in-out z-20',
          isCollapsed ? 'w-16' : 'w-80',
          className
        )}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-charcoal-750/80 bg-charcoal-950/40 min-h-[64px]">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0 shadow-[0_0_10px_rgba(208,185,51,0.15)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-wider text-sm text-slate-100 uppercase font-serif">
                    Nomata
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 font-mono rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
                    v1.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Lore & Anthroponymy Engine
                </p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto text-gold-400">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            type="button"
            data-testid="sidebar-collapse-toggle"
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className={cn(
              'p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors shrink-0',
              isCollapsed && 'hidden'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Expand Toggle when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            data-testid="sidebar-expand-toggle"
            onClick={handleToggle}
            aria-label="Expand Sidebar"
            title="Expand Sidebar"
            className="w-8 h-8 mx-auto my-2 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-charcoal-800 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-charcoal-700">
          {/* Section 1: Categories */}
          <CategoryNav isCollapsed={isCollapsed} />

          {/* Section Divider */}
          <hr className="border-charcoal-750/80 my-2" />

          {/* Section 2: Cultures & Mashup */}
          <CultureSelector isCollapsed={isCollapsed} />

          {/* Section Divider */}
          <hr className="border-charcoal-750/80 my-2" />

          {/* Section 3: Custom Vocabulary Trigger */}
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Custom Lexicon
                </span>
                {customItemsCount > 0 && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
                    {`${customItemsCount} active`}
                  </span>
                )}
              </div>

              <button
                type="button"
                data-testid="open-custom-vocab-button"
                onClick={() => setIsVocabModalOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-700/80 hover:border-gold-500/40 text-slate-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded bg-gold-500/10 text-gold-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-medium text-slate-200 group-hover:text-gold-300 transition-colors">
                      Custom Vocabulary
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Roots, titles & affixes
                    </div>
                  </div>
                </div>

                <Sliders className="w-3.5 h-3.5 text-slate-400 group-hover:text-gold-400 transition-colors" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                data-testid="open-custom-vocab-button"
                onClick={() => setIsVocabModalOpen(true)}
                title={`Custom Vocabulary (${customItemsCount} active)`}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative',
                  customItemsCount > 0
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800'
                )}
              >
                <BookOpen className="w-4 h-4" />
                {customItemsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gold-400 shadow-[0_0_6px_rgba(208,185,51,0.8)]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Status summary */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-t border-charcoal-750/80 bg-charcoal-950/50 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gold-400" />
              <span>
                {activeCultureIds.length === 1
                  ? '1 Active Tradition'
                  : `${activeCultureIds.length} Blended Cultures`}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Nomata Core</span>
          </div>
        )}
      </aside>

      {/* Custom Vocabulary Modal */}
      <CustomVocabularyModal
        isOpen={isVocabModalOpen}
        onClose={() => setIsVocabModalOpen(false)}
      />
    </>
  );
};

export default LeftSidebar;
