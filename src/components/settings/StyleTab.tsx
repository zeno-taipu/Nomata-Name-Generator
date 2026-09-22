import React from 'react';
import { Palette, Type, Sliders, Layers, Sparkles } from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { FONT_FAMILY_OPTIONS } from '../../theme/themeConfig';

export const StyleTab: React.FC = () => {
  const themeSettings = useNominaStore((s) => s.themeSettings);
  const updateThemeSettings = useNominaStore((s) => s.updateThemeSettings);

  const handleColorChange = (key: keyof typeof themeSettings, value: string) => {
    updateThemeSettings({ [key]: value });
  };

  const handleNumberChange = (key: keyof typeof themeSettings, value: number) => {
    updateThemeSettings({ [key]: value });
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* SECTION 1: Accent Colors & Text */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-charcoal-750 pb-2">
          <Palette className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Palette & Accent Colors
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Primary Accent */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Primary Accent</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.primaryAccent}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-primary-accent"
                value={themeSettings.primaryAccent}
                onChange={(e) => handleColorChange('primaryAccent', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.primaryAccent}
                onChange={(e) => handleColorChange('primaryAccent', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Secondary Accent */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Secondary Accent</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.secondaryAccent}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-secondary-accent"
                value={themeSettings.secondaryAccent}
                onChange={(e) => handleColorChange('secondaryAccent', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.secondaryAccent}
                onChange={(e) => handleColorChange('secondaryAccent', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Border & Line Color */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Borders & Dividers</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.borderColor}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-border"
                value={themeSettings.borderColor}
                onChange={(e) => handleColorChange('borderColor', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.borderColor}
                onChange={(e) => handleColorChange('borderColor', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Primary Text */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Primary Text</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.textPrimary}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-text-primary"
                value={themeSettings.textPrimary}
                onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.textPrimary}
                onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Muted Text */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Muted Text</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.textMuted}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-text-muted"
                value={themeSettings.textMuted}
                onChange={(e) => handleColorChange('textMuted', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.textMuted}
                onChange={(e) => handleColorChange('textMuted', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Surfaces & Backgrounds */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-charcoal-750 pb-2">
          <Layers className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Surfaces & Backgrounds
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* App Shell Background */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>App Shell</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.bgApp}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-bg-app"
                value={themeSettings.bgApp}
                onChange={(e) => handleColorChange('bgApp', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.bgApp}
                onChange={(e) => handleColorChange('bgApp', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Panels / Sidebar Background */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Sidebars & Shelf</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.bgPanel}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-bg-panel"
                value={themeSettings.bgPanel}
                onChange={(e) => handleColorChange('bgPanel', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.bgPanel}
                onChange={(e) => handleColorChange('bgPanel', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Header Background */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Top Header</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.bgHeader}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-bg-header"
                value={themeSettings.bgHeader}
                onChange={(e) => handleColorChange('bgHeader', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.bgHeader}
                onChange={(e) => handleColorChange('bgHeader', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>

          {/* Card Background */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Card Surface</span>
              <span className="font-mono text-[11px] text-slate-400">{themeSettings.bgCard}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                data-testid="color-bg-card"
                value={themeSettings.bgCard}
                onChange={(e) => handleColorChange('bgCard', e.target.value)}
                className="w-8 h-8 rounded border border-charcoal-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={themeSettings.bgCard}
                onChange={(e) => handleColorChange('bgCard', e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-charcoal-900 border border-charcoal-700 rounded text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Card Transparency & Glassmorphism */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-charcoal-750 pb-2">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Card Transparency & Frosted Glass
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Opacity Slider */}
          <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300">Card Opacity</span>
              <span className="font-mono font-semibold text-gold-400">
                {Math.round(themeSettings.cardOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              data-testid="slider-card-opacity"
              min="0.1"
              max="1.0"
              step="0.02"
              value={themeSettings.cardOpacity}
              onChange={(e) => handleNumberChange('cardOpacity', parseFloat(e.target.value))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Low opacity creates glassmorphic cards revealing the background.
            </p>
          </div>

          {/* Card Backdrop Blur Slider */}
          <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300">Backdrop Blur</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.cardBlur}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-card-blur"
              min="0"
              max="24"
              step="1"
              value={themeSettings.cardBlur}
              onChange={(e) => handleNumberChange('cardBlur', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Frosted glass diffusion behind cards and lineage elements.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: Granular Typography Sizes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-charcoal-750 pb-2">
          <Sliders className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Granular Typography Sizes
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Entity Names / Card Titles */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">Entity Names</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.fontSizeEntityName}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-font-entity-name"
              min="12"
              max="28"
              step="1"
              value={themeSettings.fontSizeEntityName}
              onChange={(e) => handleNumberChange('fontSizeEntityName', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 truncate">Card title & name headings</div>
          </div>

          {/* General UI Text */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">General UI & Nav</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.fontSizeUi}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-font-ui"
              min="10"
              max="18"
              step="1"
              value={themeSettings.fontSizeUi}
              onChange={(e) => handleNumberChange('fontSizeUi', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 truncate">Buttons, labels, menus</div>
          </div>

          {/* Subtitles & Epithets */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">Subtitles & Epithets</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.fontSizeSubtitle}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-font-subtitle"
              min="9"
              max="16"
              step="1"
              value={themeSettings.fontSizeSubtitle}
              onChange={(e) => handleNumberChange('fontSizeSubtitle', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 truncate">Titles, lore meanings, translations</div>
          </div>

          {/* Badges & Subtypes */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">Pills & Badges</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.fontSizeBadge}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-font-badge"
              min="8"
              max="14"
              step="1"
              value={themeSettings.fontSizeBadge}
              onChange={(e) => handleNumberChange('fontSizeBadge', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 truncate">Culture tags, subtypes, counters</div>
          </div>

          {/* Monospace Roots */}
          <div className="bg-charcoal-850 p-3 rounded-lg border border-charcoal-750 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">Etymon Roots & Mono</span>
              <span className="font-mono font-semibold text-gold-400">{themeSettings.fontSizeMono}px</span>
            </div>
            <input
              type="range"
              data-testid="slider-font-mono"
              min="8"
              max="14"
              step="1"
              value={themeSettings.fontSizeMono}
              onChange={(e) => handleNumberChange('fontSizeMono', parseInt(e.target.value, 10))}
              className="w-full accent-gold-400 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 truncate">Lexical roots, phonetic tags</div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Font Families */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-charcoal-750 pb-2">
          <Type className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Font Families
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entity Name Font Family */}
          <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Entity Names Typography
            </label>
            <select
              data-testid="select-font-entity"
              value={themeSettings.fontFamilyEntityName}
              onChange={(e) => handleColorChange('fontFamilyEntityName', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-charcoal-900 border border-charcoal-700 rounded-lg text-slate-200 focus:border-gold-500/50 outline-none"
            >
              {FONT_FAMILY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div
              className="mt-2 p-2 rounded bg-charcoal-900/60 border border-charcoal-800 text-sm font-semibold text-gold-300"
              style={{ fontFamily: themeSettings.fontFamilyEntityName }}
            >
              Sample: Vladislav of Danubia
            </div>
          </div>

          {/* General UI Font Family */}
          <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Interface UI Typography
            </label>
            <select
              data-testid="select-font-ui"
              value={themeSettings.fontFamilyUi}
              onChange={(e) => handleColorChange('fontFamilyUi', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-charcoal-900 border border-charcoal-700 rounded-lg text-slate-200 focus:border-gold-500/50 outline-none"
            >
              <option value='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'>
                Modern Sans-Serif (System UI / Inter)
              </option>
              <option value='Georgia, "Times New Roman", serif'>
                Classical Serif (Georgia / Times)
              </option>
              <option value='"JetBrains Mono", Menlo, Monaco, Consolas, monospace'>
                Technical Monospace (JetBrains Mono)
              </option>
            </select>
            <div
              className="mt-2 p-2 rounded bg-charcoal-900/60 border border-charcoal-800 text-xs text-slate-300"
              style={{ fontFamily: themeSettings.fontFamilyUi }}
            >
              Sample UI: Generate, Branch, Re-roll, Settings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
