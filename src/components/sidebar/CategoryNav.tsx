import React from 'react';
import { User, Castle, Mountain, Shield, Gem } from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { normalizeEntityCategory, type EntityCategory } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface CategoryItem {
  id: EntityCategory;
  normalizedId: 'character' | 'settlement' | 'geography' | 'faction' | 'artifact';
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'character',
    normalizedId: 'character',
    label: 'People & Characters',
    shortLabel: 'People',
    description: 'Historical figures, nobles & legendary warriors',
    icon: User,
  },
  {
    id: 'settlement',
    normalizedId: 'settlement',
    label: 'Settlements',
    shortLabel: 'Settlements',
    description: 'Forts, towns, ports & ancient metropolises',
    icon: Castle,
  },
  {
    id: 'geography',
    normalizedId: 'geography',
    label: 'Geography',
    shortLabel: 'Geography',
    description: 'Mountains, river basins & primeval wilds',
    icon: Mountain,
  },
  {
    id: 'faction',
    normalizedId: 'faction',
    label: 'Factions',
    shortLabel: 'Factions',
    description: 'Chivalric orders, leagues & syndicates',
    icon: Shield,
  },
  {
    id: 'artifact',
    normalizedId: 'artifact',
    label: 'Artifacts',
    shortLabel: 'Artifacts',
    description: 'Relics, enchanted blades & sacred tomes',
    icon: Gem,
  },
];

export interface CategoryNavProps {
  isCollapsed?: boolean;
  className?: string;
  onSelectCategory?: (category: EntityCategory) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  isCollapsed = false,
  className,
  onSelectCategory,
}) => {
  const activeCategory = useNominaStore((state) => state.activeCategory);
  const setActiveCategory = useNominaStore((state) => state.setActiveCategory);

  const activeNormalized = normalizeEntityCategory(activeCategory);

  const handleSelect = (category: CategoryItem) => {
    setActiveCategory(category.id);
    if (onSelectCategory) {
      onSelectCategory(category.id);
    }
  };

  return (
    <nav
      className={cn('flex flex-col gap-1', className)}
      aria-label="Category Navigation"
      role="tablist"
    >
      {!isCollapsed && (
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Domain Categories
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeNormalized === cat.normalizedId;

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={cat.label}
            title={isCollapsed ? `${cat.label} - ${cat.description}` : undefined}
            onClick={() => handleSelect(cat)}
            className={cn(
              'group relative flex items-center rounded-lg transition-all duration-200 text-left select-none',
              isCollapsed
                ? 'justify-center p-2.5 mx-auto w-10 h-10'
                : 'px-3 py-2.5 gap-3 w-full border',
              isActive
                ? 'bg-gold-500/10 text-gold-400 border-gold-500/30 shadow-[0_0_12px_rgba(208,185,51,0.08)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800/60 border-transparent'
            )}
          >
            {/* Active Indicator Bar on Left */}
            {isActive && !isCollapsed && (
              <span
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gold-400 shadow-[0_0_8px_rgba(208,185,51,0.8)]"
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                'flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-gold-400' : 'text-slate-400 group-hover:text-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
            </span>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-sm truncate leading-tight',
                      isActive ? 'text-gold-300 font-semibold' : 'text-slate-200'
                    )}
                  >
                    {cat.label}
                  </span>
                  {isActive && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/40">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                  {cat.description}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default CategoryNav;
