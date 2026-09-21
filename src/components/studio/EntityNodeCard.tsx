import React, { useState, useRef, useEffect } from 'react';
import {
  Pin,
  RefreshCw,
  GitBranch,
  Copy,
  Check,
  Languages,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { LineageBranchingEngine } from '../../engines/branching';
import { cn } from '../../utils/cn';

export interface EntityNodeCardProps {
  entity: LoreEntity;
  isCompact?: boolean;
  isSelected?: boolean;
  onSelect?: (entity: LoreEntity) => void;
  onInspectTree?: (entity: LoreEntity) => void;
  className?: string;
}

export const EntityNodeCard: React.FC<EntityNodeCardProps> = ({
  entity,
  isCompact = false,
  isSelected = false,
  onSelect,
  onInspectTree,
  className,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [isReRolling, setIsReRolling] = useState<boolean>(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  const reRollEntity = useNominaStore((s) => s.reRollEntity);
  const branchEntity = useNominaStore((s) => s.branchEntity);
  const toggleAnglicizeEntity = useNominaStore((s) => s.toggleAnglicizeEntity);
  const togglePinEntity = useNominaStore((s) => s.togglePinEntity);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);

  const culture = getCultureById(entity.cultureId);
  const isAnglicized = Boolean(entity.anglicization?.enabled);
  const isDualDisplay = Boolean(
    entity.anglicization?.exonymDualDisplay ?? exonymDualDisplay
  );
  const showDual =
    isAnglicized &&
    isDualDisplay &&
    Boolean(entity.originalName) &&
    entity.originalName !== entity.name;

  const availableSubtypes = LineageBranchingEngine.getAvailableBranchSubtypes(entity);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        branchMenuRef.current &&
        !branchMenuRef.current.contains(e.target as Node)
      ) {
        setIsBranchMenuOpen(false);
      }
    };

    if (isBranchMenuOpen && typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isBranchMenuOpen]);

  // Copy handler with visual feedback
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = showDual
      ? `${entity.name} (${entity.originalName})`
      : entity.name;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch {
      // Fallback or ignore in unsupported environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Re-roll handler
  const handleReRoll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReRolling(true);
    reRollEntity(entity.id);
    setTimeout(() => setIsReRolling(false), 300);
  };

  // Branch handler
  const handleBranchSubtype = (subtype: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBranchMenuOpen(false);
    branchEntity(entity.id, subtype, 1);
  };

  // Pin handler
  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinEntity(entity);
  };

  // Anglicize handler
  const handleToggleAnglicize = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleAnglicizeEntity(entity.id);
  };

  // Inspect Tree handler
  const handleInspectTree = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveEntityId(entity.id);
    if (onInspectTree) {
      onInspectTree(entity);
    }
  };

  const childrenCount = entity.children?.length ?? 0;

  return (
    <div
      data-testid={`entity-card-${entity.id}`}
      onClick={() => onSelect?.(entity)}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl transition-all duration-200 text-left select-none',
        'bg-charcoal-900/90 hover:bg-charcoal-850 border',
        isSelected
          ? 'border-gold-500/60 shadow-[0_0_15px_rgba(208,185,51,0.2)] bg-charcoal-850'
          : 'border-charcoal-700/70 hover:border-gold-500/30 hover:shadow-lg',
        isCompact ? 'p-3' : 'p-4',
        className
      )}
    >
      {/* Top Header: Subtype, Culture Tag & Quick Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Subtype Badge */}
          <span
            data-testid="entity-subtype"
            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-charcoal-800 border border-charcoal-700/80 text-slate-300 capitalize truncate max-w-[140px]"
          >
            {entity.subtype || entity.category}
          </span>

          {/* Culture Tag */}
          <span
            data-testid="entity-culture"
            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 truncate max-w-[140px]"
            title={`Origin: ${culture?.name || entity.cultureId}`}
          >
            {culture?.name || entity.cultureId}
          </span>

          {/* Lineage Child Count indicator if entity has children */}
          {childrenCount > 0 && (
            <span
              data-testid="entity-children-badge"
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-gold-500/10 border border-gold-500/30 text-gold-400"
              title={`${childrenCount} subordinate descendant${childrenCount > 1 ? 's' : ''}`}
            >
              <GitBranch className="w-3 h-3" />
              <span>{childrenCount}</span>
            </span>
          )}
        </div>

        {/* Pin Button */}
        <button
          type="button"
          data-testid="pin-button"
          onClick={handleTogglePin}
          className={cn(
            'p-1.5 rounded-lg border transition-colors shrink-0',
            entity.pinned
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-amber-400 hover:bg-charcoal-800'
          )}
          title={entity.pinned ? 'Unpin from World Bible' : 'Pin to World Bible'}
        >
          <Pin
            className={cn(
              'w-4 h-4',
              entity.pinned ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
            )}
          />
        </button>
      </div>

      {/* Main Body: Entity Name, Dual Display, and Etymology */}
      <div className="my-2.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3
            data-testid="entity-name"
            className="font-serif font-bold text-lg text-slate-100 tracking-wide group-hover:text-gold-300 transition-colors"
          >
            {entity.name}
          </h3>

          {showDual && (
            <span
              data-testid="entity-dual-display"
              className="text-xs text-gold-400/80 font-mono tracking-tight"
            >
              {`(${entity.originalName})`}
            </span>
          )}
        </div>

        {/* Optional Title or Epithet */}
        {(entity.originalTitle || entity.epithet) && (
          <p
            data-testid="entity-epithet"
            className="text-xs text-gold-400/70 font-serif italic mt-0.5 truncate"
          >
            {entity.originalTitle || entity.epithet}
          </p>
        )}

        {/* Etymon Root & Cultural Origin Indicator */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
          {(entity.rootName || entity.originalRoot) && (
            <span
              data-testid="entity-root-badge"
              className="px-1.5 py-0.5 rounded bg-charcoal-950/70 border border-charcoal-700/60 font-mono text-slate-400"
              title="Lexical Root Etymon"
            >
              {`root: ${entity.rootName || entity.originalRoot}`}
            </span>
          )}

          {entity.anglicization?.phoneticApproximation && (
            <span
              data-testid="entity-phonetic-badge"
              className="font-mono text-slate-400 text-[10px]"
              title="Phonetic Approximation"
            >
              {`[${entity.anglicization.phoneticApproximation}]`}
            </span>
          )}

          {entity.meaning && (
            <span
              data-testid="entity-meaning"
              className="italic text-slate-400 text-[11px] truncate max-w-[200px]"
              title={entity.meaning}
            >
              {`“${entity.meaning}”`}
            </span>
          )}
        </div>
      </div>

      {/* Footer Action Toolbar */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-charcoal-800/80 mt-1">
        {/* Left Actions: Branch Dropdown */}
        <div className="relative" ref={branchMenuRef}>
          <button
            type="button"
            data-testid="branch-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBranchMenuOpen(!isBranchMenuOpen);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gold-400 hover:text-gold-300 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 transition-colors"
            title="Branch hierarchical child or subdivision"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>+ Branch</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
          </button>

          {/* Subtype Dropdown Menu */}
          {isBranchMenuOpen && (
            <div
              data-testid="branch-dropdown"
              className="absolute left-0 bottom-full mb-1.5 w-52 rounded-lg bg-charcoal-900 border border-gold-500/40 shadow-2xl py-1 z-30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-charcoal-750">
                Available Lineages
              </div>
              <button
                type="button"
                data-testid="branch-option-auto"
                onClick={(e) => handleBranchSubtype('auto', e)}
                className="w-full text-left px-3 py-1.5 text-xs text-gold-400 hover:bg-gold-500/15 flex items-center justify-between transition-colors"
              >
                <span>Auto Subordinate</span>
                <Sparkles className="w-3 h-3 text-gold-400" />
              </button>
              {availableSubtypes.map((st) => (
                <button
                  key={st}
                  type="button"
                  data-testid={`branch-option-${st.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => handleBranchSubtype(st, e)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-charcoal-800 hover:text-gold-300 flex items-center justify-between transition-colors"
                >
                  <span>{st}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions: Re-roll, Anglicize, Copy, Inspect Tree */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Re-roll */}
          <button
            type="button"
            data-testid="reroll-button"
            onClick={handleReRoll}
            className="p-1.5 rounded-md hover:bg-charcoal-800 hover:text-gold-400 transition-colors"
            title="Re-roll name while maintaining hierarchy"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isReRolling && 'animate-spin text-gold-400')}
            />
          </button>

          {/* Quick Anglicize Toggle */}
          <button
            type="button"
            data-testid="anglicize-toggle-button"
            onClick={handleToggleAnglicize}
            className={cn(
              'p-1.5 rounded-md border transition-colors',
              isAnglicized
                ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                : 'border-transparent hover:bg-charcoal-800 hover:text-gold-400'
            )}
            title={
              isAnglicized
                ? 'Revert to authentic historical orthography'
                : 'Anglicize name'
            }
          >
            <Languages className="w-3.5 h-3.5" />
          </button>

          {/* Copy Name */}
          <button
            type="button"
            data-testid="copy-button"
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-charcoal-800 hover:text-gold-400 transition-colors"
            title="Copy name to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Inspect Tree */}
          <button
            type="button"
            data-testid="inspect-tree-button"
            onClick={handleInspectTree}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-gold-400 hover:bg-charcoal-800 transition-colors"
            title="Inspect Lineage Tree"
          >
            <span className="hidden sm:inline">Tree</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
