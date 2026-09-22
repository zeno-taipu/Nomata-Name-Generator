import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SettingsModal } from '../src/components/settings/SettingsModal';
import { StyleTab } from '../src/components/settings/StyleTab';
import { DataImportTab } from '../src/components/settings/DataImportTab';
import { PresetsTab } from '../src/components/settings/PresetsTab';
import { useNominaStore } from '../src/store/useNominaStore';
import { DEFAULT_THEME_SETTINGS } from '../src/theme/themeConfig';

describe('Settings Modal & Configuration Tabs', () => {
  beforeEach(() => {
    useNominaStore.getState().resetThemeSettings();
  });

  describe('SettingsModal Container', () => {
    it('does not render when isOpen is false', () => {
      const html = renderToString(
        React.createElement(SettingsModal, { isOpen: false, onClose: () => {} })
      );
      expect(html).toBe('');
    });

    it('renders modal dialog with tabs and header when isOpen is true', () => {
      const html = renderToString(
        React.createElement(SettingsModal, { isOpen: true, onClose: () => {} })
      );

      expect(html).toContain('data-testid="settings-modal"');
      expect(html).toContain('Settings &amp; Appearance');
      expect(html).toContain('data-testid="tab-import"');
      expect(html).toContain('data-testid="tab-style"');
      expect(html).toContain('data-testid="close-settings-button"');
      expect(html).toContain('data-testid="done-settings-button"');

      // Assert tab order: Data & Ingestion first, then Colors & Typography
      const importIdx = html.indexOf('data-testid="tab-import"');
      const styleIdx = html.indexOf('data-testid="tab-style"');
      expect(importIdx).toBeGreaterThan(-1);
      expect(styleIdx).toBeGreaterThan(-1);
      expect(importIdx).toBeLessThan(styleIdx);
    });

    it('renders specific initial tab when requested', () => {
      const html = renderToString(
        React.createElement(SettingsModal, {
          isOpen: true,
          onClose: () => {},
          initialTab: 'style',
        })
      );

      expect(html).toContain('data-testid="style-presets-subsection"');
      expect(html).toContain('data-testid="color-primary-accent"');
    });
  });

  describe('StyleTab Component', () => {
    it('renders theme presets sub-section, color pickers, opacity slider, font size sliders, and font family dropdowns', () => {
      const html = renderToString(React.createElement(StyleTab));

      // Premade theme presets sub-section
      expect(html).toContain('data-testid="style-presets-subsection"');
      expect(html).toContain('data-testid="reset-theme-button"');
      expect(html).toContain('data-testid="preset-card-default"');
      expect(html).toContain('data-testid="preset-card-obsidian_amber"');
      expect(html).toContain('data-testid="preset-card-emerald_archive"');

      // Color pickers
      expect(html).toContain('data-testid="color-primary-accent"');
      expect(html).toContain('data-testid="color-secondary-accent"');
      expect(html).toContain('data-testid="color-border"');
      expect(html).toContain('data-testid="color-text-primary"');
      expect(html).toContain('data-testid="color-text-muted"');

      // Surface backgrounds
      expect(html).toContain('data-testid="color-bg-app"');
      expect(html).toContain('data-testid="color-bg-panel"');
      expect(html).toContain('data-testid="color-bg-header"');
      expect(html).toContain('data-testid="color-bg-card"');

      // Card transparency & blur
      expect(html).toContain('data-testid="slider-card-opacity"');
      expect(html).toContain('data-testid="slider-card-blur"');

      // Granular font sizes
      expect(html).toContain('data-testid="slider-font-entity-name"');
      expect(html).toContain('data-testid="slider-font-ui"');
      expect(html).toContain('data-testid="slider-font-subtitle"');
      expect(html).toContain('data-testid="slider-font-badge"');
      expect(html).toContain('data-testid="slider-font-mono"');

      // Font families
      expect(html).toContain('data-testid="select-font-entity"');
      expect(html).toContain('data-testid="select-font-ui"');
    });

    it('updates themeSettings in store when actions are triggered', () => {
      useNominaStore.getState().updateThemeSettings({
        primaryAccent: '#f59e0b',
        cardOpacity: 0.7,
        fontSizeEntityName: 22,
      });

      const current = useNominaStore.getState().themeSettings;
      expect(current.primaryAccent).toBe('#f59e0b');
      expect(current.cardOpacity).toBe(0.7);
      expect(current.fontSizeEntityName).toBe(22);
    });
  });

  describe('DataImportTab Component', () => {
    it('renders dropzone, culture target, category target, and installed baseline cultures', () => {
      const html = renderToString(React.createElement(DataImportTab));

      expect(html).toContain('data-testid="seed-dropzone"');
      expect(html).toContain('data-testid="select-target-culture"');
      expect(html).toContain('data-testid="select-target-category"');
      expect(html).toContain('Danubian Slavic');
      expect(html).toContain('Celtic Gaelic');
      expect(html).toContain('Nordic Scandian');
      expect(html).toContain('Greco Aegean');
      expect(html).toContain('Levantine Semitic');
    });
  });

  describe('PresetsTab Component', () => {
    it('renders all curated presets and reset button', () => {
      const html = renderToString(React.createElement(PresetsTab));

      expect(html).toContain('data-testid="reset-theme-button"');
      expect(html).toContain('data-testid="preset-card-default"');
      expect(html).toContain('data-testid="preset-card-obsidian_amber"');
      expect(html).toContain('data-testid="preset-card-midnight_indigo"');
      expect(html).toContain('data-testid="preset-card-emerald_archive"');
      expect(html).toContain('data-testid="preset-card-high_contrast_pitch"');
    });

    it('applies preset theme and restores defaults cleanly', () => {
      useNominaStore.getState().applyPresetTheme('midnight_indigo');
      let current = useNominaStore.getState().themeSettings;
      expect(current.primaryAccent).toBe('#38bdf8');
      expect(current.bgApp).toBe('#030712');

      useNominaStore.getState().resetThemeSettings();
      current = useNominaStore.getState().themeSettings;
      expect(current.primaryAccent).toBe(DEFAULT_THEME_SETTINGS.primaryAccent);
      expect(current.bgApp).toBe(DEFAULT_THEME_SETTINGS.bgApp);
    });
  });
});
