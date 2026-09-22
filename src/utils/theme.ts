import { ThemeSettings, DEFAULT_THEME_SETTINGS } from '../theme/themeConfig';

/**
 * Converts hex color to rgb components for rgba alpha blending
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== 'string') {
    return { r: 208, g: 185, b: 51 };
  }
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return { r: 208, g: 185, b: 51 };
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 208, g: 185, b: 51 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Injects CSS variables onto document.documentElement for instant zero-reload UI updates
 */
export function applyThemeToDOM(theme: ThemeSettings = DEFAULT_THEME_SETTINGS): void {
  if (typeof document === 'undefined' || !document.documentElement) return;

  const root = document.documentElement;
  const safeTheme = { ...DEFAULT_THEME_SETTINGS, ...(theme || {}) };

  // Colors
  root.style.setProperty('--color-accent', safeTheme.primaryAccent);
  root.style.setProperty('--color-accent-secondary', safeTheme.secondaryAccent);
  root.style.setProperty('--color-border', safeTheme.borderColor);
  root.style.setProperty('--color-text-primary', safeTheme.textPrimary);
  root.style.setProperty('--color-text-muted', safeTheme.textMuted);

  // Backgrounds
  root.style.setProperty('--bg-app', safeTheme.bgApp);
  root.style.setProperty('--bg-panel', safeTheme.bgPanel);
  root.style.setProperty('--bg-header', safeTheme.bgHeader);
  root.style.setProperty('--bg-card', safeTheme.bgCard);

  // Card Appearance (with computed rgba)
  const cardRgb = hexToRgb(safeTheme.bgCard);
  const cardRgba = `rgba(${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}, ${safeTheme.cardOpacity})`;
  root.style.setProperty('--bg-card-computed', cardRgba);
  root.style.setProperty('--card-opacity', String(safeTheme.cardOpacity));
  root.style.setProperty('--card-blur', `${safeTheme.cardBlur}px`);

  // RGB channel variables with standard comma-separation for universal WebKit & browser compatibility
  const accentRgb = hexToRgb(safeTheme.primaryAccent);
  const secAccentRgb = hexToRgb(safeTheme.secondaryAccent);
  const borderRgb = hexToRgb(safeTheme.borderColor);
  const textPriRgb = hexToRgb(safeTheme.textPrimary);
  const textMutRgb = hexToRgb(safeTheme.textMuted);

  const bgAppRgb = hexToRgb(safeTheme.bgApp);
  const bgPanelRgb = hexToRgb(safeTheme.bgPanel);
  const bgHeaderRgb = hexToRgb(safeTheme.bgHeader);

  root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  root.style.setProperty('--color-accent-secondary-rgb', `${secAccentRgb.r}, ${secAccentRgb.g}, ${secAccentRgb.b}`);
  root.style.setProperty('--color-border-rgb', `${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}`);
  root.style.setProperty('--color-text-primary-rgb', `${textPriRgb.r}, ${textPriRgb.g}, ${textPriRgb.b}`);
  root.style.setProperty('--color-text-muted-rgb', `${textMutRgb.r}, ${textMutRgb.g}, ${textMutRgb.b}`);

  root.style.setProperty('--bg-app-rgb', `${bgAppRgb.r}, ${bgAppRgb.g}, ${bgAppRgb.b}`);
  root.style.setProperty('--bg-panel-rgb', `${bgPanelRgb.r}, ${bgPanelRgb.g}, ${bgPanelRgb.b}`);
  root.style.setProperty('--bg-header-rgb', `${bgHeaderRgb.r}, ${bgHeaderRgb.g}, ${bgHeaderRgb.b}`);
  root.style.setProperty('--bg-card-rgb', `${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}`);

  // Font Sizes
  root.style.setProperty('--font-size-entity-name', `${safeTheme.fontSizeEntityName}px`);
  root.style.setProperty('--font-size-ui', `${safeTheme.fontSizeUi}px`);
  root.style.setProperty('--font-size-subtitle', `${safeTheme.fontSizeSubtitle}px`);
  root.style.setProperty('--font-size-badge', `${safeTheme.fontSizeBadge}px`);
  root.style.setProperty('--font-size-mono', `${safeTheme.fontSizeMono}px`);

  // Font Families
  root.style.setProperty('--font-family-entity', safeTheme.fontFamilyEntityName);
  root.style.setProperty('--font-family-ui', safeTheme.fontFamilyUi);
}
