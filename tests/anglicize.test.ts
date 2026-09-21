import { describe, it, expect } from 'vitest';
import { AnglicizationEngine } from '../src/engines/anglicize';
import { LoreEntity } from '../src/types/domain';

describe('AnglicizationEngine', () => {
  const engine = new AnglicizationEngine();

  // 1. Stage 1: Phonetic Smoothing Tests
  it('smooths foreign consonant clusters and phonetics in phonetic mode', () => {
    const result = engine.anglicize('Szczepan', { mode: 'phonetic' });
    expect(result.anglicizedName).toBe('Schepan');
  });

  it('smooths various cultural consonant clusters into English equivalents', () => {
    // Slavic / Nordic / Celtic / Semitic clusters
    expect(engine.anglicize('Czcibor', { mode: 'phonetic' }).anglicizedName).toBe('Chcibor');
    expect(engine.anglicize('Szyszko', { mode: 'phonetic' }).anglicizedName).toBe('Shyshko');
    expect(engine.anglicize('Khaled', { mode: 'phonetic' }).anglicizedName).toBe('Kaled');
    expect(engine.anglicize('Dhamar', { mode: 'phonetic' }).anglicizedName).toBe('Damar');
    expect(engine.anglicize('Ghazali', { mode: 'phonetic' }).anglicizedName).toBe('Gazali');
    expect(engine.anglicize('Tariq', { mode: 'phonetic' }).anglicizedName).toBe('Tarik');
    expect(engine.anglicize('Llywelyn', { mode: 'phonetic' }).anglicizedName).toBe('Lywelyn');
    expect(engine.anglicize('Siobhan', { mode: 'phonetic' }).anglicizedName).toBe('Siovan');
    expect(engine.anglicize('Jan', { mode: 'phonetic', cultureId: 'danubian_slavic' }).anglicizedName).toBe('Yan');
    expect(engine.anglicize('Bjorn', { mode: 'phonetic', cultureId: 'nordic_scandian' }).anglicizedName).toBe('Byorn');
  });

  // 2. Stage 2: Morphological & Suffix Localization Tests
  it('maps cultural suffixes to English equivalents in suffix mode', () => {
    const slavic = engine.anglicize('Radomir Radovescu', { mode: 'suffix', cultureId: 'danubian_slavic' });
    expect(slavic.anglicizedName).toMatch(/Radov(ey|ton|ford)/);

    const celtic = engine.anglicize('Dunsalach', { mode: 'suffix', cultureId: 'celtic_gaelic' });
    expect(celtic.anglicizedName).toMatch(/Dunsal(ock|en|ham)/);
  });

  it('maps suffixes across Nordic, Hellenic, and Levantine cultures', () => {
    // Nordic
    const nordicSon = engine.anglicize('Thorsteinsheim', { mode: 'suffix', cultureId: 'nordic_scandian' });
    expect(nordicSon.anglicizedName).toMatch(/Thorstein(stead|by)/);

    // Hellenic
    const hellenicOs = engine.anglicize('Alexandros', { mode: 'suffix', cultureId: 'greco_aegean' });
    expect(hellenicOs.anglicizedName).toBe('Alexandrus');

    const hellenicIos = engine.anglicize('Demetrios', { mode: 'suffix', cultureId: 'greco_aegean' });
    expect(hellenicIos.anglicizedName).toBe('Demetre');

    // Levantine
    const levantineAl = engine.anglicize('Al-Rashid', { mode: 'suffix', cultureId: 'levantine_semitic' });
    expect(levantineAl.anglicizedName).toMatch(/(The |)Rashid/);
  });

  // 3. Stage 3: Full Anglo-Norman / Archaic Mode & Dual Display
  it('supports full Anglo-Norman archaic mode and dual display', () => {
    const result = engine.anglicize('Gwilym ap Rhys', { mode: 'full', exonymDualDisplay: true });
    expect(result.anglicizedName).toContain('Fitz');
    expect(result.formattedDisplay).toContain('Gwilym ap Rhys');
  });

  it('localizes archaic honorifics and epithets in full mode', () => {
    const result = engine.anglicize('Vasile cel Viteaz', {
      mode: 'full',
      cultureId: 'danubian_slavic',
      title: 'cel Viteaz',
      root: 'Vasile',
    });
    expect(result.anglicizedName).toMatch(/Basil (the Brave|the Valiant)/);
    expect(result.anglicizedRoot).toBe('Basil');
    expect(result.anglicizedTitle).toMatch(/(the Brave|the Valiant)/);
  });

  it('formats dual display correctly for character and settlement entities', () => {
    const charEntity: LoreEntity = {
      id: 'c-1',
      name: 'Radmore',
      originalName: 'Radomir',
      originalRoot: 'Radomir',
      category: 'character',
      cultureId: 'danubian_slavic',
      anglicization: {
        enabled: true,
        mode: 'full',
        anglicizedName: 'Radmore',
        anglicizedRoot: 'Radmore',
        exonymDualDisplay: true,
      },
    };
    expect(engine.formatDisplay(charEntity)).toBe('Radomir (Radmore)');

    const settlementEntity: LoreEntity = {
      id: 's-1',
      name: 'Angus Fort',
      originalName: 'Dun Aonghasa',
      originalRoot: 'Aonghas',
      category: 'settlement',
      cultureId: 'celtic_gaelic',
      anglicization: {
        enabled: true,
        mode: 'full',
        anglicizedName: 'Angus Fort',
        anglicizedRoot: 'Angus',
        exonymDualDisplay: true,
      },
    };
    expect(engine.formatDisplay(settlementEntity)).toBe('Dun Aonghasa / Angus Fort');
  });

  // 4. Lossless Revert Tests
  it('losslessly reverts LoreEntity to original cultural baseline', () => {
    const entity: LoreEntity = {
      id: 'test-1',
      name: 'Vasile cel Viteaz',
      originalName: 'Vasile cel Viteaz',
      rootName: 'Vasile',
      originalRoot: 'Vasile',
      originalTitle: 'cel Viteaz',
      category: 'character',
      cultureId: 'danubian_slavic',
      tags: [],
      metadata: {},
      createdAt: Date.now(),
    };

    const anglicized = engine.anglicizeEntity(entity, { mode: 'full' });
    expect(anglicized.name).not.toBe(entity.originalName);
    expect(anglicized.anglicization?.enabled).toBe(true);

    const reverted = engine.revert(anglicized);
    expect(reverted.name).toBe('Vasile cel Viteaz');
    expect(reverted.rootName).toBe('Vasile');
    expect(reverted.anglicization?.enabled).toBe(false);
  });

  it('safely handles reverting an entity that was not anglicized or already reverted', () => {
    const rawEntity: LoreEntity = {
      id: 'raw-1',
      name: 'Branimir',
      originalName: 'Branimir',
      originalRoot: 'Bran',
      category: 'character',
      cultureId: 'danubian_slavic',
    };

    const reverted = engine.revert(rawEntity);
    expect(reverted.name).toBe('Branimir');
    expect(reverted.anglicization?.enabled).toBe(false);
  });
});
