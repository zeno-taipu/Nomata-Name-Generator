# Design Specification: Nomata Tabbed Settings Modal & Granular Theme Engine

**Date:** 2026-09-22  
**Status:** Ready for Review  
**Target:** Desktop App UI (`Nomata`)

---

## 1. Overview & Objectives
The user requires a dedicated **Settings** cog in the desktop header that opens an accessible, tabbed modal. This modal provides:
1. **Style & Appearance Tab**: Full, granular control over colors, surface backgrounds, card transparency/glassmorphism, granular text sizes (per UI element type), and selectable font families for both entity names and general UI.
2. **Data & Import Tab**: A foundational UI for ingesting external seed databases, custom dictionaries, and literary corpora (to be expanded in subsequent features).
3. **Theme Presets & Reset**: Quick one-click curated themes plus a non-destructive "Reset to Defaults" action.

---

## 2. User Interface & Workflow

### 2.1 Navigation & Trigger
- **Header Placement**: In [`AppHeader.tsx`](file:///Users/victor.sorescu/Desktop/Nomata%20-%20Name%20Generator%20/src/components/header/AppHeader.tsx), place a `Settings` cog button (`header-settings-btn`) in the top-right toolbar between the Export Hub trigger and the Right Shelf collapse toggle.
- **Keyboard Shortcut**: `Cmd+,` (macOS) / `Ctrl+,` (Windows/Linux) triggers the settings modal.
- **Accessibility**: Modal conforms to WAI-ARIA dialog pattern (`role="dialog"`, `aria-modal="true"`, focus trap, `Escape` key to dismiss, and outside backdrop click to close).

### 2.2 Modal Architecture (Tabbed Layout)
- **Header**: "Settings" title with tab navigation pills:
  1. `Style` (Palette icon)
  2. `Data & Import` (Database / Upload icon)
  3. `Presets` (Sparkles icon)
- **Footer**: "Close" button and "Reset to Defaults" button.

---

## 3. Style & Appearance Controls

### 3.1 Colors & Accents
- **Primary Accent**: Used for active highlights, primary buttons, badges, gold trim. Interactive color picker input (`type="color"`) + hex text input.
- **Secondary Accent**: Used for subtitles, secondary badges, hover states.
- **Border & Divider Color**: Controls card borders, tree branch connector lines, and pane dividers.
- **Primary Text Color**: Controls card names, headings, active text.
- **Muted Text Color**: Controls descriptions, secondary metadata, tooltips.

### 3.2 Surface Backgrounds
- **App Shell Background**: Base background for desktop window.
- **Panels & Sidebar Background**: Left navigation pane and right World Bible shelf.
- **Header Background**: Top banner surface.

### 3.3 Card Appearance & Transparency
- **Card Background Color**: Color swatch + hex input for card bodies.
- **Card Opacity**: Continuous slider (`10%` to `100%`, default `90%`). Adjusts alpha opacity of card surfaces.
- **Card Backdrop Blur**: Slider (`0px` to `24px`, default `8px`). Controls frosted-glass glassmorphism blur over the background.

### 3.4 Granular Typography Sizes
Rather than a single coarse global zoom, provide independent granular steppers/sliders for specific UI tiers:
1. **Entity Names / Card Titles**: Default `16px` (range: `12px` to `28px`, step `1px`).
2. **General Interface & Nav Text**: Default `13px` (range: `10px` to `18px`, step `1px`).
3. **Subtitles, Epithets & Meanings**: Default `12px` (range: `9px` to `16px`, step `1px`).
4. **Pills, Badges & Subtype Tags**: Default `11px` (range: `8px` to `14px`, step `1px`).
5. **Root Etymons / Monospace Elements**: Default `11px` (range: `8px` to `14px`, step `1px`).

### 3.5 Selectable Font Families
- **Entity Names Font Family**:
  - `Serif (Cinzel / Garamond / Georgia / serif)` [Default]
  - `Modern Sans (Inter / system-ui / sans-serif)`
  - `Classic Monospace (JetBrains Mono / monospace)`
  - `Medieval / Antique (Cinzel Decorative / Georgia / serif)`
- **Interface / General UI Font Family**:
  - `Modern Sans (system-ui / -apple-system / Inter)` [Default]
  - `Warm Serif (Georgia / serif)`
  - `Monospace (JetBrains Mono / monospace)`

---

## 4. Data & Import Tab (Foundation)
- **Staging Ground**: Provides clear UI preparation for seed database ingestion:
  - File Dropzone supporting `.json`, `.csv`, `.txt` corpora.
  - Category and culture target selectors for custom seed imports.
  - Informational banners describing upcoming ingestion mechanics (custom Markov n-gram extraction, lexicon overrides, and frequency distributions).
  - Status list showing default installed historical corpora (Danubian Slavic, Celtic Gaelic, Nordic Scandian, Greco Aegean, Levantine Semitic).

---

## 5. Theme Presets & Reset
One-click presets:
1. **Default Charcoal & Gold** (Dark charcoal `#121316`, Gold `#d0b933`, 90% opacity).
2. **Obsidian & Amber** (Deep black `#08080a`, Warm Amber `#f59e0b`, 95% opacity).
3. **Midnight Indigo** (Deep navy `#0b0f19`, Sapphire `#38bdf8`, 85% opacity, 12px blur).
4. **Emerald Archive** (Forest slate `#0a1410`, Jade `#34d399`, 90% opacity).
5. **High Contrast Pitch** (Pure black `#000000`, Bright Gold `#fbbf24`, 100% opacity).
- **Reset Button**: Restores all theme variables to exact default constants.

---

## 6. Technical Architecture & Implementation

### 6.1 State Management ([`useNominaStore.ts`](file:///Users/victor.sorescu/Desktop/Nomata%20-%20Name%20Generator%20/src/store/useNominaStore.ts))
Define `ThemeSettings`:
```typescript
export interface ThemeSettings {
  // Colors
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
  cardOpacity: number; // 0.1 to 1.0
  cardBlur: number; // 0 to 24px

  // Granular Font Sizes (in px)
  fontSizeEntityName: number;
  fontSizeUi: number;
  fontSizeSubtitle: number;
  fontSizeBadge: number;
  fontSizeMono: number;

  // Font Families
  fontFamilyEntityName: string;
  fontFamilyUi: string;
}
```
Include `themeSettings: ThemeSettings` in Zustand state with `updateThemeSettings(partial: Partial<ThemeSettings>)` and `resetThemeSettings()`.

### 6.2 Dynamic CSS Variable Injection
A utility `applyThemeToDOM(theme: ThemeSettings)` dynamically updates CSS custom properties on `:root`:
- `--color-accent: {theme.primaryAccent};`
- `--color-accent-secondary: {theme.secondaryAccent};`
- `--color-border: {theme.borderColor};`
- `--color-text-primary: {theme.textPrimary};`
- `--color-text-muted: {theme.textMuted};`
- `--bg-app: {theme.bgApp};`
- `--bg-panel: {theme.bgPanel};`
- `--bg-header: {theme.bgHeader};`
- `--bg-card: {theme.bgCard};`
- `--card-opacity: {theme.cardOpacity};`
- `--card-blur: {theme.cardBlur}px;`
- `--font-size-entity-name: {theme.fontSizeEntityName}px;`
- `--font-size-ui: {theme.fontSizeUi}px;`
- `--font-size-subtitle: {theme.fontSizeSubtitle}px;`
- `--font-size-badge: {theme.fontSizeBadge}px;`
- `--font-size-mono: {theme.fontSizeMono}px;`
- `--font-family-entity: {theme.fontFamilyEntityName};`
- `--font-family-ui: {theme.fontFamilyUi};`

These CSS variables are bound to the Tailwind utility styles or inline style hooks, ensuring immediate, zero-flicker live updates as sliders or colors are manipulated.

---

## 7. Verification & Testing
1. **Unit & Component Tests**:
   - `tests/settings.test.ts`: Modal rendering, tab switching, color adjustments, font size steppers, preset applications, and reset action.
2. **End-to-End Regression**:
   - Verify `npm test` across all 16 test suites.
   - Verify `npm run build` succeeds without type errors.
   - Verify HMR in Tauri dev app.
