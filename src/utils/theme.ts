import { ThemeSettings, DEFAULT_THEME_SETTINGS } from '../theme/themeConfig';

/**
 * Converts hex color to rgb components for rgba alpha blending
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 18, g: 19, b: 22 };
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

  // Colors
  root.style.setProperty('--color-accent', theme.primaryAccent);
  root.style.setProperty('--color-accent-secondary', theme.secondaryAccent);
  root.style.setProperty('--color-border', theme.borderColor);
  root.style.setProperty('--color-text-primary', theme.textPrimary);
  root.style.setProperty('--color-text-muted', theme.textMuted);

  // Backgrounds
  root.style.setProperty('--bg-app', theme.bgApp);
  root.style.setProperty('--bg-panel', theme.bgPanel);
  root.style.setProperty('--bg-header', theme.bgHeader);
  root.style.setProperty('--bg-card', theme.bgCard);

  // Card Appearance (with computed rgba)
  const cardRgb = hexToRgb(theme.bgCard);
  const cardRgba = `rgba(${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}, ${theme.cardOpacity})`;
  root.style.setProperty('--bg-card-computed', cardRgba);
  root.style.setProperty('--card-opacity', String(theme.cardOpacity));
  root.style.setProperty('--card-blur', `${theme.cardBlur}px`);

  // Font Sizes
  root.style.setProperty('--font-size-entity-name', `${theme.fontSizeEntityName}px`);
  root.style.setProperty('--font-size-ui', `${theme.fontSizeUi}px`);
  root.style.setProperty('--font-size-subtitle', `${theme.fontSizeSubtitle}px`);
  root.style.setProperty('--font-size-badge', `${theme.fontSizeBadge}px`);
  root.style.setProperty('--font-size-mono', `${theme.fontSizeMono}px`);

  // Font Families
  root.style.setProperty('--font-family-entity', theme.fontFamilyEntityName);
  root.style.setProperty('--font-family-ui', theme.fontFamilyUi);
}
