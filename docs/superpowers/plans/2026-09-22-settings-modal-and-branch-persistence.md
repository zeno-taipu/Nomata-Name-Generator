# Settings Modal, Granular Theme Engine & Branch Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tabbed Settings Modal with full granular styling (colors, backgrounds, card transparency/blur, granular typography, font families), seed database ingestion staging tab, presets, and fix the persistent branch selection and quick repeat button.

---

## File Structure

- **Modified Files:**
  - `src/types/domain.ts`: Add `ThemeSettings` interface, update `LoreEntity` with `lastBranchSubtype?: string`.
  - `src/store/useNominaStore.ts`: Add `themeSettings` state, theme actions (`updateThemeSettings`, `resetThemeSettings`, `applyPresetTheme`), and `setEntityBranchSubtype`.
  - `src/index.css`: Add CSS variable bindings for dynamic theme styling (accent colors, card backgrounds, opacity, blur, font sizes, font families).
  - `src/components/studio/EntityNodeCard.tsx`: Turn branch button into dynamic persistent label (`+ ${subtype}`), add split dropdown trigger, wire quick `+` repeat button to persistent last branch subtype.
  - `src/components/header/AppHeader.tsx`: Add Settings cog button (`header-settings-btn`) and `onOpenSettings` prop.
  - `src/App.tsx`: Manage `isSettingsModalOpen` state, wire `Cmd/Ctrl + ,` shortcut, render `SettingsModal`.
  - `tests/studio.test.ts`: Verify branch button label updates, persists, and repeat branch works properly.
  - `tests/e2e_generation.test.ts`: Verify settings button in header, modal dialog opening, and theme adjustments.

- **New Files:**
  - `src/theme/themeConfig.ts`: Default theme constants, preset theme definitions, font family options.
  - `src/utils/theme.ts`: `applyThemeToDOM(theme: ThemeSettings)` utility for injecting CSS variables into `document.documentElement`.
  - `src/components/settings/SettingsModal.tsx`: Accessible tabbed modal container.
  - `src/components/settings/StyleTab.tsx`: Granular color pickers, background controls, card transparency/blur, font sizes, font families.
  - `src/components/settings/DataImportTab.tsx`: Seed database ingestion staging tab with dropzone and format specs.
  - `src/components/settings/PresetsTab.tsx`: One-click curated presets and reset action.
  - `src/components/settings/index.ts`: Barrel exports for settings components.
  - `tests/theme.test.ts`: Unit tests for theme configuration, CSS variable application, and store actions.
  - `tests/settings.test.ts`: Integration tests for settings modal rendering, tabs, and styling controls.

---

## Tasks

### Task 1: Fix Branch Button Label, Persistence, and Split Repeat Action

- [ ] **Step 1: Write failing test in `tests/studio.test.ts`**
  - Add test asserting:
    1. Initial card shows `+ Branch` (or available default).
    2. When a subtype (e.g. `'Heir'`) is selected, the button label turns to `+ Heir`.
    3. The selection is persistent on the entity.
    4. Clicking `branch-repeat-button` creates another entity of subtype `'Heir'`.
  - Run `npx vitest run tests/studio.test.ts` to confirm test behavior.

- [ ] **Step 2: Update `src/types/domain.ts` and `src/store/useNominaStore.ts`**
  - Add `lastBranchSubtype?: string` to `LoreEntity`.
  - In `useNominaStore.ts`, update `branchEntity` to persist `lastBranchSubtype: childSubtype` on the parent entity.
  - Add `setEntityBranchSubtype: (entityId: string, subtype: string) => void` action to store.

- [ ] **Step 3: Update `src/components/studio/EntityNodeCard.tsx`**
  - Read `entity.lastBranchSubtype`.
  - If set and not `'auto'`, display `+ ${entity.lastBranchSubtype}`; if not, display `+ Branch`.
  - Split button / trigger: clicking the main button creates another of `entity.lastBranchSubtype || availableSubtypes[0] || 'auto'`; clicking the chevron opens the dropdown.
  - When a subtype is selected from the dropdown: call `setEntityBranchSubtype(entity.id, subtype)` and `branchEntity(entity.id, subtype, 1)`.
  - The quick `+` button (`branch-repeat-button`) creates another of `entity.lastBranchSubtype || availableSubtypes[0] || 'auto'`.

- [ ] **Step 4: Verify tests pass**
  - Run `npx vitest run tests/studio.test.ts`.
  - Commit: `git commit -m "fix: make branch subtype selection persistent on button label and repeat action"`

---

### Task 2: Theme Settings Domain, Store Integration, and CSS Variables Engine

- [ ] **Step 1: Write failing tests in `tests/theme.test.ts`**
  - Test `applyThemeToDOM` injects CSS custom properties on `:root`.
  - Test store actions: `updateThemeSettings`, `resetThemeSettings`, `applyPresetTheme`.
  - Run `npx vitest run tests/theme.test.ts` and verify failure.

- [ ] **Step 2: Create `src/theme/themeConfig.ts`**
  - Define `ThemeSettings` interface:
    - Primary and secondary accent colors.
    - Border and divider color.
    - Text colors (primary, muted).
    - Background colors (app shell, panels, header, card).
    - Card opacity (`0.1` to `1.0`) and card blur (`0px` to `24px`).
    - Granular font sizes in px: `fontSizeEntityName`, `fontSizeUi`, `fontSizeSubtitle`, `fontSizeBadge`, `fontSizeMono`.
    - Font families: `fontFamilyEntityName`, `fontFamilyUi`.
  - Define `DEFAULT_THEME_SETTINGS` (matching current dark charcoal and gold).
  - Define `THEME_PRESETS`: *Charcoal & Gold*, *Obsidian & Amber*, *Midnight Indigo*, *Emerald Archive*, *High Contrast Pitch*.
  - Define font family presets: Serif, Sans-Serif, Monospace, Medieval.

- [ ] **Step 3: Create `src/utils/theme.ts`**
  - Implement `applyThemeToDOM(theme: ThemeSettings): void`:
    - Sets document CSS variables `--color-accent`, `--bg-app`, `--bg-card`, `--card-opacity`, `--card-blur`, `--font-size-entity-name`, etc.

- [ ] **Step 4: Integrate into `src/store/useNominaStore.ts`**
  - Add `themeSettings: ThemeSettings` to state and persistence.
  - Implement `updateThemeSettings(partial)`, `resetThemeSettings()`, and `applyPresetTheme(presetKey)`.
  - Automatically call `applyThemeToDOM` on state updates.

- [ ] **Step 5: Bind CSS variables in `src/index.css` and UI components**
  - Add utility bindings in `src/index.css` so that:
    - Card background uses `var(--bg-card)` with `var(--card-opacity)` and `var(--card-blur)`.
    - Headings and names use `var(--font-size-entity-name)` and `var(--font-family-entity)`.
    - Badges use `var(--font-size-badge)`.
    - Subtitles use `var(--font-size-subtitle)`.
    - Monospace elements use `var(--font-size-mono)`.
    - General UI text uses `var(--font-size-ui)` and `var(--font-family-ui)`.

- [ ] **Step 6: Run tests and verify**
  - Run `npx vitest run tests/theme.test.ts`.
  - Commit: `git commit -m "feat: implement theme configuration, CSS variables engine, and store persistence"`

---

### Task 3: Tabbed Settings Modal UI (Style, Data & Import, Presets)

- [ ] **Step 1: Write failing tests in `tests/settings.test.ts`**
  - Test modal renders with tabs: Style, Data & Import, Presets.
  - Test switching tabs.
  - Test changing colors, card opacity, font sizes, and font families.
  - Test applying a preset.
  - Test reset to defaults button.
  - Run `npx vitest run tests/settings.test.ts` to verify failure.

- [ ] **Step 2: Create `src/components/settings/StyleTab.tsx`**
  - Accents section: color pickers with hex text inputs for primary accent, secondary accent, border, text colors.
  - Backgrounds section: app background, panel background, header background, card background.
  - Card Glassmorphism section: opacity slider (`10% – 100%`) and blur slider (`0px – 24px`) with live visual preview card.
  - Granular Typography section: individual steppers/sliders for:
    - Entity Names / Card Titles (`12px – 28px`)
    - General UI Text (`10px – 18px`)
    - Subtitles & Epithets (`9px – 16px`)
    - Badges & Pills (`8px – 14px`)
    - Root Etymons / Monospace (`8px – 14px`)
  - Font Families section: dropdown selects for Entity Name Font Family and UI Font Family.

- [ ] **Step 3: Create `src/components/settings/DataImportTab.tsx`**
  - Staging area for custom seed database ingestion:
    - Drag-and-drop file dropzone accepting `.json`, `.csv`, `.txt`.
    - Culture and category assignment selector.
    - Information callout explaining upcoming features (Markov training from literary texts, custom vocabulary ingestion, corpus frequency weighting).
    - Status listing of default installed historical corpora (Danubian Slavic, Celtic Gaelic, Nordic Scandian, Greco Aegean, Levantine Semitic).

- [ ] **Step 4: Create `src/components/settings/PresetsTab.tsx`**
  - Cards for curated presets: *Charcoal & Gold*, *Obsidian & Amber*, *Midnight Indigo*, *Emerald Archive*, *High Contrast Pitch*.
  - "Apply Preset" buttons.
  - "Reset All Settings to Defaults" button with visual indicator.

- [ ] **Step 5: Create `src/components/settings/SettingsModal.tsx` and barrel `index.ts`**
  - Accessible modal dialog: `role="dialog"`, `aria-modal="true"`, focus trap, Escape key, outside click to dismiss.
  - Header with tab pills (Style, Data & Import, Presets) and close button.
  - Scrollable tab body.

- [ ] **Step 6: Run tests and verify**
  - Run `npx vitest run tests/settings.test.ts`.
  - Commit: `git commit -m "feat: implement tabbed Settings Modal with Style, Data & Import, and Presets tabs"`

---

### Task 4: Integrate Settings into Header and Desktop App

- [ ] **Step 1: Update `src/components/header/AppHeader.tsx`**
  - Add `Settings` cog button (`header-settings-btn`) with `Settings` icon from `lucide-react`.
  - Wire `onOpenSettings?: () => void` prop.

- [ ] **Step 2: Update `src/App.tsx`**
  - Add state `isSettingsModalOpen`.
  - Pass `onOpenSettings={() => setIsSettingsModalOpen(true)}` to `AppHeader`.
  - Add `Cmd/Ctrl + ,` global keyboard shortcut handler.
  - Render `<SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />`.
  - Ensure `applyThemeToDOM` runs on app mount with stored theme settings.

- [ ] **Step 3: Update `tests/e2e_generation.test.ts` and `tests/shelf.test.ts`**
  - Add assertions for `header-settings-btn` in `AppHeader`.
  - Add end-to-end test verifying settings modal opening and closing.

- [ ] **Step 4: Run tests and verify**
  - Run `npx vitest run tests/e2e_generation.test.ts tests/shelf.test.ts`.
  - Commit: `git commit -m "feat: wire Settings cog into AppHeader and App layout with keyboard shortcut"`

---

### Task 5: Full Regression Testing, Build Verification & Sync

- [ ] **Step 1: Run all test suites**
  - Run `npm test` across all 17 test suites (100% pass rate).
- [ ] **Step 2: Run production TypeScript and Vite build**
  - Run `npm run build` (0 type errors, clean bundle).
- [ ] **Step 3: Synchronize files to desktop folder**
  - Copy all modified/new files to `/Users/victor.sorescu/Desktop/Name Generator/`.
- [ ] **Step 4: Verify Tauri dev app hot reload**
  - Confirm the running desktop application (`task-2148`) hot-reloads cleanly.
- [ ] **Step 5: Final commit**
  - Commit: `git commit -m "feat: complete Settings modal, granular theme engine, and persistent branch selection"`
