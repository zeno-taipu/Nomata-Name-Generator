import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyThemeToDOM, hexToRgb } from '../src/utils/theme';
import { DEFAULT_THEME_SETTINGS, THEME_PRESETS, type ThemeSettings } from '../src/theme/themeConfig';

describe('Theme Engine & DOM CSS Injection', () => {
  let originalDocument: unknown;
  let mockProperties: Record<string, string>;

  beforeEach(() => {
    mockProperties = {};
    originalDocument = (globalThis as unknown as { document?: unknown }).document;
    (globalThis as unknown as { document: unknown }).document = {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => {
            mockProperties[name] = value;
          },
          getPropertyValue: (name: string) => {
            return mockProperties[name] || '';
          },
        },
      },
    };
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as unknown as { document?: unknown }).document;
    } else {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }
  });

  it('converts hex to RGB components correctly', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#d0b933')).toEqual({ r: 208, g: 185, b: 51 });
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('injects default theme CSS variables onto document.documentElement', () => {
    applyThemeToDOM(DEFAULT_THEME_SETTINGS);

    const doc = (globalThis as unknown as { document: { documentElement: { style: { getPropertyValue: (k: string) => string } } } }).document;
    const style = doc.documentElement.style;
    expect(style.getPropertyValue('--color-accent')).toBe('#d0b933');
    expect(style.getPropertyValue('--bg-app')).toBe('#0c0d0e');
    expect(style.getPropertyValue('--bg-card')).toBe('#18191e');
    expect(style.getPropertyValue('--card-opacity')).toBe('0.9');
    expect(style.getPropertyValue('--card-blur')).toBe('8px');
    expect(style.getPropertyValue('--font-size-entity-name')).toBe('17px');
    expect(style.getPropertyValue('--font-size-ui')).toBe('13px');
    expect(style.getPropertyValue('--font-family-entity')).toBe('Cinzel, Georgia, serif');
    // RGB channels for Tailwind alpha support
    expect(style.getPropertyValue('--color-accent-rgb')).toBe('208, 185, 51');
    expect(style.getPropertyValue('--bg-app-rgb')).toBe('12, 13, 14');
    expect(style.getPropertyValue('--bg-panel-rgb')).toBe('18, 19, 22');
    expect(style.getPropertyValue('--color-border-rgb')).toBe('34, 35, 42');
  });

  it('updates CSS variables dynamically with custom theme settings', () => {
    const customTheme: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      primaryAccent: '#38bdf8',
      bgApp: '#030712',
      cardOpacity: 0.75,
      cardBlur: 14,
      fontSizeEntityName: 24,
      fontFamilyEntityName: 'Inter, sans-serif',
    };

    applyThemeToDOM(customTheme);

    const doc = (globalThis as unknown as { document: { documentElement: { style: { getPropertyValue: (k: string) => string } } } }).document;
    const style = doc.documentElement.style;
    expect(style.getPropertyValue('--color-accent')).toBe('#38bdf8');
    expect(style.getPropertyValue('--color-accent-rgb')).toBe('56, 189, 248');
    expect(style.getPropertyValue('--bg-app')).toBe('#030712');
    expect(style.getPropertyValue('--bg-app-rgb')).toBe('3, 7, 18');
    expect(style.getPropertyValue('--card-opacity')).toBe('0.75');
    expect(style.getPropertyValue('--card-blur')).toBe('14px');
    expect(style.getPropertyValue('--font-size-entity-name')).toBe('24px');
    expect(style.getPropertyValue('--font-family-entity')).toBe('Inter, sans-serif');
  });

  it('propagates preset colors across the full app theme variables', () => {
    const emeraldPreset = THEME_PRESETS.find((p) => p.id === 'emerald_archive');
    expect(emeraldPreset).toBeDefined();

    const mergedSettings: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      ...emeraldPreset!.settings,
    };

    applyThemeToDOM(mergedSettings);

    const doc = (globalThis as unknown as { document: { documentElement: { style: { getPropertyValue: (k: string) => string } } } }).document;
    const style = doc.documentElement.style;

    // Check all surfaces and accents propagate
    expect(style.getPropertyValue('--color-accent')).toBe('#34d399');
    expect(style.getPropertyValue('--color-accent-rgb')).toBe('52, 211, 153');
    expect(style.getPropertyValue('--bg-app')).toBe('#05150f');
    expect(style.getPropertyValue('--bg-app-rgb')).toBe('5, 21, 15');
    expect(style.getPropertyValue('--bg-panel')).toBe('#092319');
    expect(style.getPropertyValue('--bg-panel-rgb')).toBe('9, 35, 25');
    expect(style.getPropertyValue('--color-border')).toBe('#132e24');
    expect(style.getPropertyValue('--color-border-rgb')).toBe('19, 46, 36');
    expect(style.getPropertyValue('--color-text-primary')).toBe('#f0fdf4');
    expect(style.getPropertyValue('--color-text-muted')).toBe('#86efac');
  });

  it('provides valid presets with required color and opacity attributes', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of THEME_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.preview.accent).toBeDefined();
      expect(preset.preview.bg).toBeDefined();
    }
  });

  it('correctly maps both primaryAccent and secondaryAccent to CSS variables and RGB channels', () => {
    const dualAccentTheme: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      primaryAccent: '#f43f5e',
      secondaryAccent: '#fb7185',
    };

    applyThemeToDOM(dualAccentTheme);

    const doc = (globalThis as unknown as { document: { documentElement: { style: { getPropertyValue: (k: string) => string } } } }).document;
    const style = doc.documentElement.style;

    expect(style.getPropertyValue('--color-accent')).toBe('#f43f5e');
    expect(style.getPropertyValue('--color-accent-rgb')).toBe('244, 63, 94');
    expect(style.getPropertyValue('--color-accent-secondary')).toBe('#fb7185');
    expect(style.getPropertyValue('--color-accent-secondary-rgb')).toBe('251, 113, 133');
  });
});

