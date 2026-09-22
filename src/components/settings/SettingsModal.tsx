import React, { useState, useEffect } from 'react';
import { Settings, Palette, Database, Sparkles, X } from 'lucide-react';
import { StyleTab } from './StyleTab';
import { DataImportTab } from './DataImportTab';
import { PresetsTab } from './PresetsTab';
import { cn } from '../../utils/cn';

export type SettingsTabId = 'style' | 'import' | 'presets';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'style',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Synchronize initialTab if provided when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle Escape key to close
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

  if (!isOpen) return null;

  return (
    <div
      data-testid="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        data-testid="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings and Appearance"
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl bg-charcoal-900 border border-charcoal-700/90 shadow-2xl overflow-hidden animate-scale-in select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800 bg-charcoal-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0 shadow-[0_0_12px_rgba(208,185,51,0.15)]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase font-serif">
                Settings & Appearance
              </h2>
              <p className="text-[11px] text-slate-400">
                Colors, typography, card transparency & seed database ingestion
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-settings-button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-charcoal-800 bg-charcoal-950/40 shrink-0">
          <button
            type="button"
            data-testid="tab-style"
            onClick={() => setActiveTab('style')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'style'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border border-transparent'
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Style & Typography</span>
          </button>

          <button
            type="button"
            data-testid="tab-import"
            onClick={() => setActiveTab('import')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'import'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border border-transparent'
            )}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data & Ingestion</span>
          </button>

          <button
            type="button"
            data-testid="tab-presets"
            onClick={() => setActiveTab('presets')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'presets'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 border border-transparent'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Theme Presets</span>
          </button>
        </div>

        {/* Scrollable Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-charcoal-700">
          {activeTab === 'style' && <StyleTab />}
          {activeTab === 'import' && <DataImportTab />}
          {activeTab === 'presets' && <PresetsTab />}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-charcoal-800 bg-charcoal-950/70 shrink-0">
          <div className="text-[11px] text-slate-400">
            Changes are applied live and saved automatically.
          </div>
          <button
            type="button"
            data-testid="done-settings-button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-charcoal-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 transition-all shadow-sm active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
