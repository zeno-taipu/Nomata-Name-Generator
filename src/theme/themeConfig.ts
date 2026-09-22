export interface ThemeSettings {
  // Colors & Accents
  primaryAccent: string;
  secondaryAccent: string;
  borderColor: string;
  textPrimary: string;
  textMuted: string;

  // Backgrounds
  bgApp: string;
  bgPanel: string;
  bgHeader: string;
  bgCard: string;

  // Card Appearance
  cardOpacity: number; // 0.1 to 1.0
  cardBlur: number; // 0 to 24px

  // Granular Font Sizes (in px)
  fontSizeEntityName: number; // default 17 (12 to 28)
  fontSizeUi: number;         // default 13 (10 to 18)
  fontSizeSubtitle: number;   // default 12 (9 to 16)
  fontSizeBadge: number;      // default 11 (8 to 14)
  fontSizeMono: number;       // default 11 (8 to 14)

  // Font Families
  fontFamilyEntityName: string;
  fontFamilyUi: string;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primaryAccent: '#d0b933',
  secondaryAccent: '#ece29c',
  borderColor: '#22232a',
  textPrimary: '#f1f5f9',
  textMuted: '#94a3b8',

  bgApp: '#0c0d0e',
  bgPanel: '#121316',
  bgHeader: '#0c0d0e',
  bgCard: '#18191e',

  cardOpacity: 0.9,
  cardBlur: 8,

  fontSizeEntityName: 17,
  fontSizeUi: 13,
  fontSizeSubtitle: 12,
  fontSizeBadge: 11,
  fontSizeMono: 11,

  fontFamilyEntityName: 'Cinzel, Georgia, serif',
  fontFamilyUi: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: {
    accent: string;
    bg: string;
    card: string;
  };
  settings: Partial<ThemeSettings>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Charcoal & Gold',
    description: 'The signature Nomata dark lore studio palette with polished gold accents.',
    preview: {
      accent: '#d0b933',
      bg: '#0c0d0e',
      card: '#18191e',
    },
    settings: { ...DEFAULT_THEME_SETTINGS },
  },
  {
    id: 'obsidian_amber',
    name: 'Obsidian & Amber',
    description: 'Deep obsidian black surfaces with rich glowing amber warmth.',
    preview: {
      accent: '#f59e0b',
      bg: '#09090b',
      card: '#18181b',
    },
    settings: {
      primaryAccent: '#f59e0b',
      secondaryAccent: '#fcd34d',
      borderColor: '#27272a',
      textPrimary: '#fafafa',
      textMuted: '#a1a1aa',
      bgApp: '#09090b',
      bgPanel: '#121215',
      bgHeader: '#09090b',
      bgCard: '#18181b',
      cardOpacity: 0.92,
      cardBlur: 10,
    },
  },
  {
    id: 'midnight_indigo',
    name: 'Midnight Indigo',
    description: 'Celestial dark navy with crystalline sapphire and silver accents.',
    preview: {
      accent: '#38bdf8',
      bg: '#030712',
      card: '#0f172a',
    },
    settings: {
      primaryAccent: '#38bdf8',
      secondaryAccent: '#7dd3fc',
      borderColor: '#1e293b',
      textPrimary: '#f8fafc',
      textMuted: '#94a3b8',
      bgApp: '#030712',
      bgPanel: '#0b1329',
      bgHeader: '#030712',
      bgCard: '#0f172a',
      cardOpacity: 0.85,
      cardBlur: 12,
    },
  },
  {
    id: 'emerald_archive',
    name: 'Emerald Archive',
    description: 'Deep ancient forest slate with luminous jade and mint highlights.',
    preview: {
      accent: '#34d399',
      bg: '#05150f',
      card: '#0e2d21',
    },
    settings: {
      primaryAccent: '#34d399',
      secondaryAccent: '#6ee7b7',
      borderColor: '#132e24',
      textPrimary: '#f0fdf4',
      textMuted: '#86efac',
      bgApp: '#05150f',
      bgPanel: '#092319',
      bgHeader: '#05150f',
      bgCard: '#0e2d21',
      cardOpacity: 0.9,
      cardBlur: 8,
    },
  },
  {
    id: 'high_contrast_pitch',
    name: 'High Contrast Pitch',
    description: 'Pure OLED black backdrop with razor-sharp high-contrast illumination.',
    preview: {
      accent: '#fbbf24',
      bg: '#000000',
      card: '#121212',
    },
    settings: {
      primaryAccent: '#fbbf24',
      secondaryAccent: '#fde68a',
      borderColor: '#3f3f46',
      textPrimary: '#ffffff',
      textMuted: '#d4d4d8',
      bgApp: '#000000',
      bgPanel: '#0a0a0a',
      bgHeader: '#000000',
      bgCard: '#121212',
      cardOpacity: 1.0,
      cardBlur: 0,
    },
  },
];

export const FONT_FAMILY_OPTIONS = [
  {
    id: 'serif_cinzel',
    label: 'Antique Serif (Cinzel / Garamond / Georgia)',
    value: 'Cinzel, Georgia, "Times New Roman", serif',
  },
  {
    id: 'sans_modern',
    label: 'Modern Sans (Inter / System UI)',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'mono_code',
    label: 'Technical Monospace (JetBrains Mono / Courier)',
    value: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
  },
  {
    id: 'fantasy_medieval',
    label: 'Medieval Antiqua (Uncial / Cinzel / Georgia)',
    value: '"Cinzel Decorative", Cinzel, "Palatino Linotype", Book Antiqua, Georgia, serif',
  },
];
