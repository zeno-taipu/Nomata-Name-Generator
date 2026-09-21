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

  // 5. Diacritic Removal & Normalization Tests
  it('correctly smooths European and Nordic diacritics', () => {
    expect(engine.anglicize('Stanisław', { mode: 'phonetic' }).anglicizedName).toBe('Stanislaw');
    expect(engine.anglicize('Vojtěch', { mode: 'phonetic', cultureId: 'danubian_slavic' }).anglicizedName).toBe('Voytech');
    expect(engine.anglicize('Håkon', { mode: 'phonetic', cultureId: 'nordic_scandian' }).anglicizedName).toBe('Hakon');
    expect(engine.anglicize('Haakon', { mode: 'phonetic', cultureId: 'nordic_scandian' }).anglicizedName).toBe('Haakon');
  });

  // 6. Patronymic Precision & Non-Greedy Matching Tests
  it('does not corrupt names that contain patronymic substrings like Nicholas or Macedon', () => {
    expect(engine.anglicize('Nicholas', { mode: 'full' }).anglicizedName).toBe('Nicholas');
    expect(engine.anglicize('Macedon', { mode: 'full' }).anglicizedName).toBe('Macedon');

    // Valid patronymics with whitespace or uppercase letter
    expect(engine.anglicize('MacDonald', { mode: 'full' }).anglicizedName).toBe('FitzDonald');
    expect(engine.anglicize('McGregor', { mode: 'full' }).anglicizedName).toBe('FitzGregor');
    expect(engine.anglicize('Nic Aoidh', { mode: 'full' }).anglicizedName).toBe('FitzAoidh');
  });

  // 7. Pipeline Cognate Protection Tests
  it('protects English cognates and Fitz tokens from subsequent mutation', () => {
    // Preserves English double-l in William
    expect(engine.anglicize('Gwilym', { mode: 'full' }).anglicizedName).toBe('William');

    // Protects John and FitzJames from J -> Y corruption
    const johnFitzJames = engine.anglicize('Ioan ap James', { mode: 'full', cultureId: 'celtic_gaelic' });
    expect(johnFitzJames.anglicizedName).toBe('John FitzJames');
    expect(johnFitzJames.anglicizedName).not.toContain('Yohn');
    expect(johnFitzJames.anglicizedName).not.toContain('Yames');
  });

  // 8. Toponymic vs Personal Suffix Distinction Tests
  it('distinguishes personal names from settlement toponymic suffixes', () => {
    // Personal names ending in -an should NOT become -ham
    const brian = engine.anglicize('Brian', { mode: 'suffix', cultureId: 'celtic_gaelic', category: 'character' });
    expect(brian.anglicizedName).toBe('Brian');

    const aidan = engine.anglicize('Aidan', { mode: 'suffix', cultureId: 'celtic_gaelic', category: 'character' });
    expect(aidan.anglicizedName).toBe('Aidan');

    // Settlements ending in -an CAN become -ham
    const dunSalan = engine.anglicize('Dunsalan', { mode: 'suffix', cultureId: 'celtic_gaelic', category: 'settlement' });
    expect(dunSalan.anglicizedName).toBe('Dunsalham');
  });

  // 9. Idempotency & Clean Reversion with Separate Epithet/Title Tests
  it('guarantees idempotency when toggling modes and preserves distinct titles/epithets', () => {
    const entity: LoreEntity = {
      id: 'idem-1',
      name: 'Vasile cel Viteaz',
      originalName: 'Vasile cel Viteaz',
      rootName: 'Vasile',
      originalRoot: 'Vasile',
      originalTitle: 'Knyaz',
      epithet: 'cel Viteaz',
      category: 'character',
      cultureId: 'danubian_slavic',
      metadata: { role: 'ruler' },
    };

    // First toggle to phonetic
    const phonetic = engine.anglicizeEntity(entity, { mode: 'phonetic' });
    expect(phonetic.name).toBe('Vasile cel Viteaz');

    // Then toggle to full from phonetic
    const full = engine.anglicizeEntity(phonetic, { mode: 'full' });
    expect(full.name).toBe('Basil the Brave');
    expect(full.epithet).toBe('the Brave');
    expect(full.originalTitle).toBe('Knyaz');

    // Revert back
    const reverted = engine.revert(full);
    expect(reverted.name).toBe('Vasile cel Viteaz');
    expect(reverted.rootName).toBe('Vasile');
    expect(reverted.originalTitle).toBe('Knyaz');
    expect(reverted.epithet).toBe('cel Viteaz');
    expect(reverted.metadata?.role).toBe('ruler');
    expect(reverted.metadata?._originalEpithet).toBeUndefined();
  });
});
