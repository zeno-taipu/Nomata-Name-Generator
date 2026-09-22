import React from 'react';
import { Sparkles, RotateCcw, Check } from 'lucide-react';
import { THEME_PRESETS, type ThemePreset } from '../../theme/themeConfig';
import { useNominaStore } from '../../store/useNominaStore';

export const PresetsTab: React.FC = () => {
  const themeSettings = useNominaStore((s) => s.themeSettings);
  const applyPresetTheme = useNominaStore((s) => s.applyPresetTheme);
  const resetThemeSettings = useNominaStore((s) => s.resetThemeSettings);

  return (
    <div className="space-y-6 text-slate-200">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Curated Theme Presets</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a tailored palette or reset your customizations back to default.
          </p>
        </div>

        <button
          type="button"
          data-testid="reset-theme-button"
          onClick={() => resetThemeSettings()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-400 bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-700 hover:border-amber-500/40 transition-colors shadow-sm"
          title="Reset all colors, backgrounds, opacity, and typography to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {THEME_PRESETS.map((preset: ThemePreset) => {
          const isActive =
            themeSettings.primaryAccent.toLowerCase() ===
              (preset.settings.primaryAccent || '').toLowerCase() &&
            themeSettings.bgApp.toLowerCase() ===
              (preset.settings.bgApp || '').toLowerCase();

          return (
            <div
              key={preset.id}
              data-testid={`preset-card-${preset.id}`}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-charcoal-850 border-gold-500/60 shadow-[0_0_15px_rgba(208,185,51,0.15)] ring-1 ring-gold-500/40'
                  : 'bg-charcoal-850/80 border-charcoal-750 hover:border-charcoal-600 hover:bg-charcoal-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">{preset.name}</span>
                    {isActive && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                        <Check className="w-2.5 h-2.5" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Color Swatch Dots */}
                  <div className="flex items-center gap-1.5 p-1 rounded-md bg-charcoal-900/80 border border-charcoal-700">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: preset.preview.bg }}
                      title={`Backdrop: ${preset.preview.bg}`}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: preset.preview.card }}
                      title={`Card: ${preset.preview.card}`}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: preset.preview.accent }}
                      title={`Accent: ${preset.preview.accent}`}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <button
                type="button"
                data-testid={`apply-preset-${preset.id}`}
                onClick={() => applyPresetTheme(preset.id)}
                disabled={isActive}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30 cursor-default'
                    : 'bg-charcoal-900 hover:bg-gold-500/15 text-slate-200 hover:text-gold-300 border border-charcoal-700 hover:border-gold-500/40'
                }`}
              >
                {isActive ? 'Current Active Palette' : 'Apply Theme'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
