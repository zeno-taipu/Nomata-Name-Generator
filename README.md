# Nomata - Lore & Name Studio

Nomata is a local-first desktop workspace for historically inspired names and
worldbuilding. Generate people, settlements, geographical features, factions,
and artifacts; branch them into related entities; collect selections in a World
Bible; and export your work.

Names are produced locally by Markov chains and grammar templates, not a hosted
AI service. The frontend is React/TypeScript with Zustand, Vite, and Tailwind;
Tauri 2 supplies the desktop window and native file dialogs.

## Getting started

Use Node.js 22 LTS and npm. For desktop development, also install stable Rust and
the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).
On Windows these include the Microsoft C++ build tools and WebView2.

```powershell
npm.cmd ci
npm.cmd run dev
```

The browser preview runs at `http://localhost:1420`. On systems without the
PowerShell execution-policy restriction, `npm` works in place of `npm.cmd`.

```powershell
# Desktop development (starts Vite automatically)
npm.cmd run tauri -- dev

# Tests, TypeScript validation, and production frontend build
npm.cmd test
npm.cmd run build

# Build desktop installers for the current platform
npm.cmd run tauri -- build
```

## Features and limits

- Five built-in culture profiles with weighted mixtures and typed custom seeds.
- Batch generation, rerolling, related-entity branching, and lineage inspection.
- Reversible phonetic, suffix, and full anglicization.
- Pinning, searchable collections, Markdown/JSON/CSV exports, and project files.
- Live appearance settings, theme presets, and keyboard-accessible dialogs.
- The **Data & Import** settings tab is a preview of future corpus ingestion.
  It does not read, train on, or apply external dictionaries or text corpora.
  Use custom vocabulary for supported seed input and the Export Hub for project
  restoration.

Culture datasets are curated, historically inspired seed collections, not
validated historical dictionaries. They can combine names from different periods.
The `phonetic_rules` fields are descriptive metadata: generation uses generic
phonotactic checks and does not enforce these fields as hard constraints.
Per-entry historical citations and provenance are not currently supplied; do not
treat generated names, title translations, or era labels as scholarly evidence.

## Saving and restoring work

Autosave uses the current webview/browser origin's local storage under
`nomina-world-bible-storage`. It is not a separately managed project file and is
subject to storage quota, access restrictions, and clearing of application data.
The browser preview and desktop app need not share the same saved state.

If autosave fails, a visible warning says the changes are not saved. Work remains
available in the current session, but **export a project before closing or
reloading**. Later successful writes clear the warning. Export files periodically
even when autosave is healthy.

The Export Hub saves project-bible JSON (`.nomata.json`; legacy `.nomina.json`
is also accepted). Version `1.0.0` includes entity trees, pinned membership, culture
selection and weights, generation/anglicization settings, and custom vocabulary.
It does not include every application preference (for example, theme settings).
Markdown, CSV, and plain entity JSON are output formats, not project backups.

Project import validates the complete document before replacing the current
project, including nested entities, settings, vocabulary, version, and pin
references. Invalid documents leave the current project untouched and report the
offending field. Valid import **replaces** the project; export existing work first.
Import is bounded to 64 entity levels and 10,000 entity occurrences (including
repeated snapshots of separately pinned descendants). These limits protect
recursive processing; split exceptionally large projects before importing them.

## Code map

- [`src/components`](src/components): feature-oriented React UI.
- [`src/store/useNominaStore.ts`](src/store/useNominaStore.ts): generation
  orchestration and entity/state actions.
- [`src/store/safeStorage.ts`](src/store/safeStorage.ts): storage access and
  explicitly temporary fallback; error status is separate from persisted state.
- [`src/engines`](src/engines): Markov synthesis, grammar, branching, vocabulary,
  and anglicization.
- [`src/data/cultures`](src/data/cultures): built-in profiles and validation.
- [`src/types/domain.ts`](src/types/domain.ts): entity and project contracts.
- [`src/utils/projectValidation.ts`](src/utils/projectValidation.ts): shared
  runtime validation for file imports and direct store loads.
- [`src/utils/export.ts`](src/utils/export.ts): document formatting/parsing.
- [`src/theme`](src/theme): theme defaults and presets.
- [`src-tauri`](src-tauri): native shell, capabilities, and packaging.
- [`tests`](tests): engine, store, serialization, and DOM interaction regressions.

Entity IDs determine identity and pin membership, not displayed names. The
current store retains nested batch and collection snapshots and synchronizes pin
flags across them. A normalized entity database is deferred until expanded
editing requirements justify a versioned persistence migration.

Canonical name/root fields are separate from display anglicization. Branching
derives canonical children before applying display transformations. Custom seed
categories remain distinct; importing a river stem is not an implicit request
to use it as a masculine name or mountain name. Engine caches reflect effective
training inputs rather than culture ID alone.

## Validation

```powershell
# Fast state and storage regressions
npm.cmd test -- tests/store.test.ts tests/persistence.test.ts

# Native compile/test check (frontend assets must exist first)
npm.cmd run build
cargo test --locked --manifest-path .\src-tauri\Cargo.toml
```

The [CI workflow](.github/workflows/ci.yml) runs frontend tests/build on Linux and
the frontend build plus Rust tests on Windows. DOM tests exercise real React
events, but are not a substitute for operating-system/webview testing.

Before a desktop release, run this native smoke checklist on each target OS:

1. Start the Tauri app; generate a parent and child; pin both. Confirm indicators
   remain correct after clearing the batch and toggling the child's pin.
2. Export a project through the native save dialog, restart, then import that
   file through the native open dialog. Compare entities, hierarchy, and pins.
3. Cancel both dialogs; verify the current project remains unchanged.
4. Try an unwritable export location and a malformed project file; verify visible
   failure feedback without project replacement.
5. Copy a card and an export, then paste into another application. Confirm errors
   are visible when clipboard access is denied.
6. Navigate dialogs using Tab/Shift+Tab and Escape. Confirm focus is contained
   while open and returns to the trigger when closed.
7. Change themes and generation settings, restart, and verify autosave restoration.

These checks validate native dialog scopes, OS clipboard access, and real
webview focus behavior that mocked DOM tests cannot establish.
