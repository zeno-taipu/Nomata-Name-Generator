import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileCode,
  Table,
  BookOpen,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import {
  exportToMarkdown,
  exportToJSON,
  exportToCSV,
  exportToProjectBible,
  importFromProjectBible,
} from '../../utils/export';
import type { LoreEntity } from '../../types/domain';
import { cn } from '../../utils/cn';

export type ExportFormat = 'markdown' | 'json' | 'csv' | 'nomina';
export type ExportScope = 'pinned' | 'all';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: ExportFormat;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  initialFormat = 'markdown',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initialFormat);
  const [exportScope, setExportScope] = useState<ExportScope>('pinned');
  const [copied, setCopied] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const pinnedEntities = useNominaStore((s) => s.pinnedEntities);
  const generatedBatch = useNominaStore((s) => s.generatedBatch);
  const saveProjectBible = useNominaStore((s) => s.saveProjectBible);
  const loadProjectBible = useNominaStore((s) => s.loadProjectBible);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute entities based on selected scope
  const targetEntities = useMemo<LoreEntity[]>(() => {
    if (!isOpen) return [];
    if (exportScope === 'pinned') {
      return pinnedEntities;
    }
    // Combine pinned and batch entities without duplicate IDs
    const seenIds = new Set<string>();
    const combined: LoreEntity[] = [];

    for (const entity of pinnedEntities) {
      if (!seenIds.has(entity.id)) {
        seenIds.add(entity.id);
        combined.push(entity);
      }
    }
    for (const entity of generatedBatch) {
      if (!seenIds.has(entity.id)) {
        seenIds.add(entity.id);
        combined.push(entity);
      }
    }
    return combined;
  }, [isOpen, exportScope, pinnedEntities, generatedBatch]);

  // Generate serialized content based on format & scope
  const formattedContent = useMemo<string>(() => {
    if (!isOpen) return '';
    switch (selectedFormat) {
      case 'markdown':
        return exportToMarkdown(targetEntities, { includeWikilinks: true });
      case 'json':
        return exportToJSON(targetEntities, true);
      case 'csv':
        return exportToCSV(targetEntities);
      case 'nomina': {
        const fullBible = saveProjectBible();
        if (exportScope === 'pinned') {
          return exportToProjectBible({
            ...fullBible,
            entities: fullBible.entities.filter((e) =>
              fullBible.pinnedEntityIds.includes(e.id)
            ),
          });
        }
        return exportToProjectBible(fullBible);
      }
      default:
        return '';
    }
  }, [isOpen, selectedFormat, targetEntities, exportScope, saveProjectBible]);

  // Preview content (first 40 lines)
  const previewLines = useMemo(() => {
    const lines = formattedContent.split('\n');
    const sliced = lines.slice(0, 45);
    const hasMore = lines.length > 45;
    return {
      text: sliced.join('\n') + (hasMore ? '\n\n... [content truncated in preview]' : ''),
      totalLines: lines.length,
      charCount: formattedContent.length,
    };
  }, [formattedContent]);

  // Determine export file name and extension
  const fileMeta = useMemo(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    switch (selectedFormat) {
      case 'markdown':
        return { filename: `nomata-bible-${dateStr}.md`, ext: 'md', mime: 'text/markdown' };
      case 'json':
        return { filename: `nomata-entities-${dateStr}.json`, ext: 'json', mime: 'application/json' };
      case 'csv':
        return { filename: `nomata-entities-${dateStr}.csv`, ext: 'csv', mime: 'text/csv' };
      case 'nomina':
        return {
          filename: `nomata-world-bible-${dateStr}.nomata.json`,
          ext: 'nomata.json',
          mime: 'application/json',
        };
    }
  }, [selectedFormat]);

  // Copy output to clipboard
  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedContent);
      }
    } catch {
      // Fallback in headless / unsupported environments
    }
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Download or Save File
  const handleDownload = async () => {
    const { filename, ext, mime } = fileMeta;

    // Check if running inside Tauri desktop shell
    const isTauri =
      typeof window !== 'undefined' &&
      Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);

    if (isTauri) {
      try {
        const dialogPlugin = await import('@tauri-apps/plugin-dialog');
        const fsPlugin = await import('@tauri-apps/plugin-fs');

        const filePath = await dialogPlugin.save({
          defaultPath: filename,
          filters: [
            {
              name: selectedFormat.toUpperCase(),
              extensions:
                selectedFormat === 'nomina'
                  ? ['json', 'nomina.json']
                  : [ext.replace(/^\./, '')],
            },
          ],
        });

        if (filePath) {
          await fsPlugin.writeTextFile(filePath, formattedContent);
          setImportStatus({
            type: 'success',
            message: `Successfully saved to ${filePath}`,
          });
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setImportStatus(null), 3000);
        }
        return;
      } catch (err) {
        console.warn('Native Tauri save dialog failed, falling back to browser download:', err);
      }
    }

    // Standard browser download fallback
    if (typeof document !== 'undefined') {
      try {
        const blob = new Blob([formattedContent], { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setImportStatus({
          type: 'success',
          message: `Downloaded ${filename}`,
        });
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({
          type: 'error',
          message: `Download failed: ${(err as Error).message}`,
        });
      }
    }
  };

  // Handle Bible File Upload (.nomina.json)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const bible = importFromProjectBible(text);
      loadProjectBible(bible);

      setImportStatus({
        type: 'success',
        message: `Successfully loaded "${bible.name}" (${bible.entities.length} entities)`,
      });
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: `Import failed: ${(err as Error).message}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle native Tauri file open dialog for project bible
  const handleNativeOpen = async () => {
    const isTauri =
      typeof window !== 'undefined' &&
      Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);

    if (isTauri) {
      try {
        const dialogPlugin = await import('@tauri-apps/plugin-dialog');
        const fsPlugin = await import('@tauri-apps/plugin-fs');

        const selectedPath = await dialogPlugin.open({
          multiple: false,
          filters: [
            {
              name: 'Nomata Project Bible',
              extensions: ['nomata.json', 'nomina.json', 'json'],
            },
          ],
        });

        if (selectedPath && typeof selectedPath === 'string') {
          const content = await fsPlugin.readTextFile(selectedPath);
          const bible = importFromProjectBible(content);
          loadProjectBible(bible);
          setImportStatus({
            type: 'success',
            message: `Loaded "${bible.name}" from ${selectedPath}`,
          });
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setImportStatus(null), 4000);
        }
        return;
      } catch (err) {
        console.warn('Native open dialog failed, falling back to file input:', err);
      }
    }

    // Trigger HTML input fallback
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="export-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-charcoal-900 border border-charcoal-700 rounded-2xl shadow-2xl overflow-hidden select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800 bg-charcoal-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/30">
              <Download size={18} />
            </div>
            <div>
              <h3
                id="export-modal-title"
                className="text-base font-semibold text-slate-100 font-serif tracking-wide"
              >
                Export Hub & Lore Bible
              </h3>
              <p className="text-xs text-slate-400">
                Export entities to Markdown, JSON, CSV, or save/load World Bibles.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="export-close-btn"
            aria-label="Close export dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border border-transparent hover:border-charcoal-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Notification Banner */}
        {importStatus && (
          <div
            data-testid="export-status-banner"
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 text-xs font-medium border-b',
              importStatus.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
            )}
          >
            {importStatus.type === 'success' ? (
              <Check size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
            )}
            <span className="truncate">{importStatus.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Format Tabs & Scope Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Format Tabs */}
            <div
              role="tablist"
              aria-label="Export Formats"
              className="flex items-center gap-1 p-1 bg-charcoal-950 rounded-lg border border-charcoal-800"
            >
              <button
                type="button"
                role="tab"
                data-testid="tab-markdown"
                aria-selected={selectedFormat === 'markdown'}
                onClick={() => setSelectedFormat('markdown')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedFormat === 'markdown'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-850 border border-transparent'
                )}
              >
                <FileText size={13} />
                <span>Markdown</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="tab-json"
                aria-selected={selectedFormat === 'json'}
                onClick={() => setSelectedFormat('json')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedFormat === 'json'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-850 border border-transparent'
                )}
              >
                <FileCode size={13} />
                <span>JSON</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="tab-csv"
                aria-selected={selectedFormat === 'csv'}
                onClick={() => setSelectedFormat('csv')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedFormat === 'csv'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-850 border border-transparent'
                )}
              >
                <Table size={13} />
                <span>CSV</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="tab-nomina"
                aria-selected={selectedFormat === 'nomina'}
                onClick={() => setSelectedFormat('nomina')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedFormat === 'nomina'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-850 border border-transparent'
                )}
              >
                <BookOpen size={13} />
                <span>Nomata Bible</span>
              </button>
            </div>

            {/* Scope Toggle */}
            <div className="flex items-center gap-1 p-1 bg-charcoal-950 rounded-lg border border-charcoal-800 text-xs font-medium">
              <button
                type="button"
                data-testid="scope-pinned"
                aria-pressed={exportScope === 'pinned'}
                onClick={() => setExportScope('pinned')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all',
                  exportScope === 'pinned'
                    ? 'bg-charcoal-800 text-slate-100 font-semibold border border-charcoal-700'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                Pinned ({pinnedEntities.length})
              </button>
              <button
                type="button"
                data-testid="scope-all"
                aria-pressed={exportScope === 'all'}
                onClick={() => setExportScope('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all',
                  exportScope === 'all'
                    ? 'bg-charcoal-800 text-slate-100 font-semibold border border-charcoal-700'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                All Generated ({targetEntities.length})
              </button>
            </div>
          </div>

          {/* Live Preview Pane */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Live Format Preview</span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>{previewLines.totalLines} lines</span>
                <span>•</span>
                <span>{(previewLines.charCount / 1024).toFixed(1)} KB</span>
              </div>
            </div>

            <div className="relative rounded-xl border border-charcoal-800 bg-charcoal-950 overflow-hidden">
              <pre
                data-testid="export-preview-pane"
                tabIndex={0}
                aria-label="Export preview content"
                className="p-4 font-mono text-xs text-slate-300/90 overflow-x-auto max-h-56 leading-relaxed select-text focus:outline-none"
              >
                <code>{previewLines.text}</code>
              </pre>
            </div>
          </div>

          {/* Import Project Bible Section */}
          <div className="pt-3 border-t border-charcoal-800 flex items-center justify-between gap-4">
            <div className="text-xs">
              <p className="font-medium text-slate-300">Import Existing Project</p>
              <p className="text-slate-500">Restore a previously saved .nomata.json or .nomina.json file</p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".nomata.json,.nomina.json,.json"
                onChange={handleFileChange}
                className="hidden"
                data-testid="import-file-input"
              />
              <button
                type="button"
                data-testid="import-bible-btn"
                onClick={handleNativeOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-charcoal-800 hover:bg-charcoal-750 border border-charcoal-700 hover:border-gold-500/40 rounded-lg transition-colors"
              >
                <Upload size={13} className="text-gold-400" />
                <span>Import Bible</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-charcoal-800 bg-charcoal-950/60">
          <div className="text-xs text-slate-500 truncate max-w-[200px]">
            {fileMeta.filename}
          </div>

          <div className="flex items-center gap-2">
            {/* Copy to Clipboard */}
            <button
              type="button"
              data-testid="export-copy-btn"
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-all',
                copied
                  ? 'bg-gold-500/20 text-gold-300 border-gold-500/50'
                  : 'bg-charcoal-800 text-slate-300 border-charcoal-700 hover:bg-charcoal-750 hover:text-slate-100'
              )}
            >
              {copied ? (
                <>
                  <Check size={14} className="text-gold-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            {/* Download / Save File */}
            <button
              type="button"
              data-testid="export-save-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-charcoal-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 rounded-lg shadow-md shadow-gold-500/10 transition-all active:scale-[0.98]"
            >
              <Download size={14} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
