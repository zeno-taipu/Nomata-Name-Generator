import React, { useState, useRef, useEffect } from 'react';
import {
  PinOff,
  GitBranch,
  Copy,
  Check,
} from 'lucide-react';
import type { LoreEntity } from '../../types/domain';
import { useNominaStore } from '../../store/useNominaStore';
import { getCultureById } from '../../data/cultures';
import { cn } from '../../utils/cn';

export interface PinnedItemCardProps {
  entity: LoreEntity;
  isCompact?: boolean;
  onInspectTree?: (entity: LoreEntity) => void;
  onUnpin?: (entity: LoreEntity) => void;
  className?: string;
}

export const PinnedItemCard: React.FC<PinnedItemCardProps> = ({
  entity,
  isCompact = false,
  onInspectTree,
  onUnpin,
  className,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const togglePinEntity = useNominaStore((s) => s.togglePinEntity);
  const setActiveEntityId = useNominaStore((s) => s.setActiveEntityId);
  const activeEntityId = useNominaStore((s) => s.activeEntityId);
  const exonymDualDisplay = useNominaStore((s) => s.exonymDualDisplay);

  const isActive = activeEntityId === entity.id;
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

  const childrenCount = entity.children?.length ?? 0;
  const rootText = entity.rootName || entity.originalRoot;

  // Clipboard copy handler with temporary visual feedback
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
      // Fallback or ignore in headless/unsupported test environments
    }

    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
  };

  // Unpin handler
  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinEntity(entity);
    if (onUnpin) {
      onUnpin(entity);
    }
  };

  // Inspect tree in lineage viewer
  const handleInspectTree = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveEntityId(entity.id);
    if (onInspectTree) {
      onInspectTree(entity);
    }
  };

  return (
    <div
      data-testid={`pinned-item-${entity.id}`}
      role="article"
      aria-label={`Pinned lore item: ${entity.name}, ${entity.subtype || entity.category}`}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl transition-all duration-200 text-left select-none outline-none',
        'bg-charcoal-900/90 hover:bg-charcoal-850 border',
        isActive
          ? 'border-gold-500/60 shadow-[0_0_12px_rgba(208,185,51,0.18)] bg-charcoal-850'
          : 'border-charcoal-700/70 hover:border-gold-500/30 hover:shadow-md',
        isCompact ? 'p-2.5 gap-1.5' : 'p-3.5 gap-2.5',
        className
      )}
    >
      {/* Top Bar: Subtype Pill, Culture Tag, Lineage Badge & Action Buttons */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Subtype Badge */}
          <span
            data-testid="pinned-item-subtype"
            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-charcoal-800 border border-charcoal-700/80 text-slate-300 capitalize truncate max-w-[120px]"
          >
            {entity.subtype || entity.category}
          </span>

          {/* Culture Tag */}
          <span
            data-testid="pinned-item-culture"
            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 truncate max-w-[120px]"
            title={`Origin: ${culture?.name || entity.cultureId}`}
          >
            {culture?.name || entity.cultureId}
          </span>

          {/* Children count indicator */}
          {childrenCount > 0 && (
            <span
              data-testid="pinned-item-children"
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-gold-500/10 border border-gold-500/30 text-gold-400"
              title={`${childrenCount} branched lineage children`}
            >
              <GitBranch size={10} />
              {childrenCount}
            </span>
          )}
        </div>

        {/* Action Buttons: Copy, Inspect Tree, Unpin */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Copy Button */}
          <button
            type="button"
            data-testid="pinned-copy-btn"
            aria-label="Copy entity name"
            title="Copy name to clipboard"
            onClick={handleCopy}
            className={cn(
              'p-1 rounded-md transition-colors border',
              copied
                ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-750 border-transparent hover:border-charcoal-700'
            )}
          >
            {copied ? <Check size={13} className="text-gold-400" /> : <Copy size={13} />}
          </button>

          {/* Inspect Tree Action */}
          <button
            type="button"
            data-testid="pinned-inspect-btn"
            aria-label="Inspect entity lineage tree"
            title="View entity lineage in studio"
            onClick={handleInspectTree}
            className="p-1 rounded-md text-slate-400 hover:text-gold-400 hover:bg-charcoal-750 border border-transparent hover:border-charcoal-700 transition-colors"
          >
            <GitBranch size={13} />
          </button>

          {/* Unpin Action */}
          <button
            type="button"
            data-testid="pinned-unpin-btn"
            aria-label="Unpin entity from bible"
            title="Remove from World Bible"
            onClick={handleUnpin}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-charcoal-750 border border-transparent hover:border-charcoal-700 transition-colors"
          >
            <PinOff size={13} />
          </button>
        </div>
      </div>

      {/* Middle: Primary Entity Name & Dual Anglicization Display */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <h4
            data-testid="pinned-item-name"
            className="text-sm font-semibold tracking-wide text-slate-100 font-serif truncate"
            title={entity.name}
          >
            {entity.name}
          </h4>

          {showDual && (
            <span
              data-testid="pinned-item-original-name"
              className="text-xs text-gold-400/90 font-serif italic"
              title={`Original historical form: ${entity.originalName}`}
            >
              {`(${entity.originalName})`}
            </span>
          )}
        </div>

        {/* Epithet if present */}
        {entity.epithet && (
          <p
            data-testid="pinned-item-epithet"
            className="text-xs text-slate-400 italic truncate mt-0.5"
          >
            {entity.epithet}
          </p>
        )}
      </div>

      {/* Bottom: Root / Meaning Badges & Metadata */}
      {(rootText || entity.meaning) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-charcoal-800 text-[11px] text-slate-400">
          {rootText && (
            <span
              data-testid="pinned-item-root"
              className="font-mono text-slate-400/90 truncate max-w-[150px]"
              title={`Etymological Root: ${rootText}`}
            >
              <span className="text-slate-500">root:</span> {rootText}
            </span>
          )}

          {rootText && entity.meaning && (
            <span className="text-charcoal-600 select-none">•</span>
          )}

          {entity.meaning && (
            <span
              data-testid="pinned-item-meaning"
              className="italic text-slate-400 truncate max-w-[180px]"
              title={`Meaning: ${entity.meaning}`}
            >
              &ldquo;{entity.meaning}&rdquo;
            </span>
          )}
        </div>
      )}
    </div>
  );
};
