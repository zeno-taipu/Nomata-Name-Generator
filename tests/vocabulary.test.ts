import { describe, it, expect } from 'vitest';
import {
  deriveVariationsFromRoots,
  formatPrefix,
  formatSuffix,
  prepareCustomGenerationContext,
} from '../src/engines/vocabulary';
import { cultures } from '../src/data/cultures';

describe('Custom Vocabulary & Seed Lexicon Derivation Engine', () => {
  describe('formatPrefix', () => {
    it('formats prepositional and standalone word prefixes with spacing', () => {
      expect(formatPrefix('Von')).toBe('Von ');
      expect(formatPrefix('De')).toBe('De ');
      expect(formatPrefix('San')).toBe('San ');
      expect(formatPrefix('New')).toBe('New ');
      expect(formatPrefix('Old')).toBe('Old ');
      expect(formatPrefix('Fort')).toBe('Fort ');
      expect(formatPrefix('Port')).toBe('Port ');
    });

    it('preserves hyphens and apostrophes without unwanted spaces', () => {
      expect(formatPrefix('Al-')).toBe('Al-');
      expect(formatPrefix('Fort-')).toBe('Fort-');
      expect(formatPrefix("O'")).toBe("O'");
      expect(formatPrefix('Mac-')).toBe('Mac-');
    });

    it('handles empty or combining prefixes gracefully', () => {
      expect(formatPrefix('')).toBe('');
      expect(formatPrefix('Belo')).toBe('Belo');
      expect(formatPrefix('Staro')).toBe('Staro');
    });
  });

  describe('formatSuffix', () => {
    it('strips leading hyphens from attaching suffixes', () => {
      expect(formatSuffix('-grad')).toBe('grad');
      expect(formatSuffix('-ford')).toBe('ford');
      expect(formatSuffix('-by')).toBe('by');
      expect(formatSuffix('-stead')).toBe('stead');
      expect(formatSuffix('-haven')).toBe('haven');
      expect(formatSuffix('-burg')).toBe('burg');
      expect(formatSuffix('-ville')).toBe('ville');
    });

    it('adds leading space for standalone toponymic words without hyphen', () => {
      expect(formatSuffix('Ward')).toBe(' Ward');
      expect(formatSuffix('Quarter')).toBe(' Quarter');
      expect(formatSuffix('Reach')).toBe(' Reach');
    });
  });

  describe('deriveVariationsFromRoots', () => {
    it('generates rich given names starting from the seed root rather than regurgitating the raw root', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.givenNames.length).toBeGreaterThan(5);
      // Ensure all given names start with the root stem
      for (const name of result.givenNames) {
        expect(name.toLowerCase().startsWith('valer')).toBe(true);
      }
      // Ensure it is NOT just the bare root
      const hasExpandedName = result.givenNames.some((n) => n.length > 'Valer'.length);
      expect(hasExpandedName).toBe(true);
      expect(result.givenNames).toContain('Valerik');
      expect(result.givenNames).toContain('Valerian');
    });

    it('generates derived patronymic and locative surnames from the seed root', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.surnames.length).toBeGreaterThan(4);
      expect(result.surnames).toContain('Valerov');
      expect(result.surnames).toContain('Valerovic');
      expect(result.surnames).toContain('Valerski');
    });

    it('generates derived settlement compounds rather than bare roots', () => {
      const result = deriveVariationsFromRoots(['Valer'], 'danubian_slavic');

      expect(result.settlementNames.length).toBeGreaterThan(5);
      expect(result.settlementNames).toContain('Valergrad');
      expect(result.settlementNames).toContain('Valerovo');
      expect(result.settlementNames).toContain('Stari Valer');
      // Must not contain bare "Valer" as a full settlement name
      expect(result.settlementNames).not.toContain('Valer');
    });

    it('generates geographic, faction, and artifact variations from the seed root', () => {
      const result = deriveVariationsFromRoots(['Khor'], 'nordic_scandian');

      expect(result.stems).toContain('Mount Khor');
      expect(result.stems).toContain('Khor Peaks');
      expect(result.stems).toContain('Khor River');
      expect(result.factionRoots).toContain('House Khor');
      expect(result.factionRoots).toContain('The Khor Guard');
      expect(result.artifactRoots).toContain('The Khor Blade');
      expect(result.artifactRoots).toContain('Crown of Khor');
    });
  });

  describe('prepareCustomGenerationContext', () => {
    it('augments culture and grammar templates with custom affixes and roots', () => {
      const primaryCulture = cultures['danubian_slavic'];
      const customVocab = {
        honorifics: ['Grand Inquisitor'],
        customPrefixes: ['Fort-'],
        customSuffixes: ['-haven'],
        customSeeds: {
          settlement_roots: ['Valer'],
          epithets: ['the Undaunted'],
        },
      };

      const context = prepareCustomGenerationContext(primaryCulture, customVocab, 'settlement');

      // Check custom variables
      expect(context.customVariables['prefix']).toContain('Fort-');
      expect(context.customVariables['suffix']).toContain('haven');
      expect(context.customVariables['title']).toContain('Grand Inquisitor');
      expect(context.customVariables['epithet']).toContain('the Undaunted');

      // Check root variations in customVariables
      const roots = context.customVariables['root'] as string[];
      expect(roots.length).toBeGreaterThan(0);
      expect(roots.some((r) => r.toLowerCase().includes('valer'))).toBe(true);

      // Check settlement templates prioritize affixes
      expect(context.templates.some((t) => t.includes('{prefix}'))).toBe(true);
      expect(context.templates.some((t) => t.includes('{suffix}'))).toBe(true);
    });
  });
});
