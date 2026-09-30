/**
 * Non-Destructive Anglicization ("Englishification") Overlay Engine
 *
 * Implements a 3-stage transformation pipeline:
 * 1. Stage 1 (Phonetic Smoothing): Foreign consonant/vowel clusters to English orthography.
 * 2. Stage 2 (Morphological & Suffix Localization): Cultural patronymic/locative suffixes.
 * 3. Stage 3 (Full Anglo-Norman / Archaic Localization): Patronymic prefixing, archaic honorifics,
 *    and historical English cognates.
 *
 * Provides lossless reversion and exonym/endonym dual display support.
 */

import type { LoreEntity, AnglicizationOverlay, EntityCategory } from '../types/domain';

export interface AnglicizeOptions {
  mode?: 'phonetic' | 'suffix' | 'full';
  exonymDualDisplay?: boolean;
  cultureId?: string;
  category?: EntityCategory;
  root?: string;
  title?: string;
}

export interface AnglicizationResult {
  originalName: string;
  anglicizedName: string;
  anglicizedRoot: string;
  anglicizedTitle?: string;
  formattedDisplay: string;
  mode: 'phonetic' | 'suffix' | 'full';
  overlay: AnglicizationOverlay;
}

// ============================================================================
// Stage 1: Phonetic Smoothing Mappings
// ============================================================================

interface ClusterMapping {
  pattern: RegExp;
  replacement: string;
}

const PHONETIC_CLUSTERS: ClusterMapping[] = [
  // Compound Polish/Slavic clusters first (before individual cz / sz)
  { pattern: /szcz/gi, replacement: 'sch' },
  { pattern: /Szcz/g, replacement: 'Sch' },

  // Affricates and sibilants
  { pattern: /cz/gi, replacement: 'ch' },
  { pattern: /sz/gi, replacement: 'sh' },
  { pattern: /rz/gi, replacement: 'r' },

  // Velar and dental fricatives/stops
  { pattern: /kh/gi, replacement: 'k' },
  { pattern: /dh/gi, replacement: 'd' },
  { pattern: /gh/gi, replacement: 'g' },

  // Celtic mutations: only word-initial Ll/ll
  { pattern: /bh/gi, replacement: 'v' },
  { pattern: /mh/gi, replacement: 'v' },
  { pattern: /\bLl/g, replacement: 'L' },
  { pattern: /\bll/g, replacement: 'l' },

  // Q without U to K, lone Q to K
  { pattern: /q(?=[^u]|$)/gi, replacement: 'k' },
];

/**
 * Diacritics mapping for authentic historical orthographies
 */
const DIACRITIC_MAP: Record<string, string> = {
  // Czech / Slovak / Baltic carons
  č: 'ch', Č: 'Ch',
  ć: 'ch', Ć: 'Ch',
  š: 'sh', Š: 'Sh',
  ž: 'zh', Ž: 'Zh',
  ě: 'e',  Ě: 'E',
  ř: 'r',  Ř: 'R',
  ť: 't',  Ť: 'T',
  ď: 'd',  Ď: 'D',
  ň: 'n',  Ň: 'N',

  // Polish crossed L, nasal vowels, accents
  ł: 'l',  Ł: 'L',
  ń: 'n',  Ń: 'N',
  ś: 'sh', Ś: 'Sh',
  ź: 'z',  Ź: 'Z',
  ż: 'z',  Ż: 'Z',
  ą: 'a',  Ą: 'A',
  ę: 'e',  Ę: 'E',

  // Romanian comma-below / circumflex
  ș: 'sh', Ș: 'Sh',
  ț: 'ts', Ț: 'Ts',
  ă: 'a',  Ă: 'A',
  î: 'i',  Î: 'I',
  â: 'a',  Â: 'A',

  // Germanic / Nordic umlauts & vowels
  ä: 'a',  Ä: 'A',
  ö: 'o',  Ö: 'O',
  ü: 'u',  Ü: 'U',
  å: 'a',  Å: 'A',
  æ: 'ae', Æ: 'Ae',
  ø: 'o',  Ø: 'O',
  ð: 'd',  Ð: 'D',
  þ: 'th', Þ: 'Th',

  // Hungarian double acute
  ő: 'o',  Ő: 'O',
  ű: 'u',  Ű: 'U',

  // Standard accents & umlauts
  á: 'a',  Á: 'A',
  é: 'e',  É: 'E',
  í: 'i',  Í: 'I',
  ó: 'o',  Ó: 'O',
  ú: 'u',  Ú: 'U',
  ý: 'y',  Ý: 'Y',
  ů: 'u',  Ů: 'U',
  ë: 'e',  Ë: 'E',
  ï: 'i',  Ï: 'I',
};

// ============================================================================
// Stage 2: Morphological & Suffix Localization Mappings
// ============================================================================

interface SuffixRule {
  suffix: string;
  replacement: string;
  toponymicOnly?: boolean;
}

const CULTURAL_SUFFIXES: Record<string, SuffixRule[]> = {
  danubian_slavic: [
    { suffix: 'escu', replacement: 'ey' },
    { suffix: 'ski', replacement: 'ton' },
    { suffix: 'sky', replacement: 'ton' },
    { suffix: 'vich', replacement: 'son' },
    { suffix: 'vic', replacement: 'son' },
    { suffix: 'ich', replacement: 'son' },
    { suffix: 'ic', replacement: 'son' },
    { suffix: 'grad', replacement: 'burgh' },
    { suffix: 'ovo', replacement: 'ton' },
    { suffix: 'ica', replacement: 'ey' },
    { suffix: 'ova', replacement: 'ford' },
    { suffix: 'eva', replacement: 'ford' },
    { suffix: 'ov', replacement: 'ford' },
    { suffix: 'ev', replacement: 'ford' },
  ],
  celtic_gaelic: [
    { suffix: 'ach', replacement: 'ock' },
    { suffix: 'oc', replacement: 'en' },
    { suffix: 'og', replacement: 'en' },
    { suffix: 'an', replacement: 'ham', toponymicOnly: true },
    { suffix: 'in', replacement: 'ham', toponymicOnly: true },
    { suffix: 'mor', replacement: 'more' },
    { suffix: 'beg', replacement: 'little' },
  ],
  nordic_scandian: [
    { suffix: 'sheim', replacement: 'stead' },
    { suffix: 'heim', replacement: 'stead' },
    { suffix: 'sdottir', replacement: 'by' },
    { suffix: 'dottir', replacement: 'by' },
    { suffix: 'sson', replacement: 'son' },
    { suffix: 'son', replacement: 'son' },
    { suffix: 'gard', replacement: 'bury' },
    { suffix: 'borg', replacement: 'burgh' },
    { suffix: 'by', replacement: 'town' },
    { suffix: 'stad', replacement: 'stead' },
    { suffix: 'fjorden', replacement: 'firth' },
    { suffix: 'fjord', replacement: 'firth' },
  ],
  greco_aegean: [
    { suffix: 'polis', replacement: 'city' },
    { suffix: 'eios', replacement: 'e' },
    { suffix: 'ios', replacement: 'e' },
    { suffix: 'os', replacement: 'us' },
    { suffix: 'on', replacement: 'field', toponymicOnly: true },
    { suffix: 'as', replacement: 'e' },
    { suffix: 'is', replacement: 'y' },
  ],
  levantine_semitic: [
    { suffix: 'awi', replacement: 'ite' },
    { suffix: 'iya', replacement: 'ia' },
    { suffix: 'iyah', replacement: 'ia' },
    { suffix: 'i', replacement: 'ian' },
  ],
};

// ============================================================================
// Stage 3: Full Anglo-Norman / Archaic Mappings & Cognates
// ============================================================================

const COGNATES: Record<string, string> = {
  // Danubian Slavic
  vasile: 'Basil',
  radomir: 'Radmore',
  vladimir: 'Walter',
  stanislav: 'Stanley',
  miroslav: 'Merrick',
  branimir: 'Branmore',
  dragan: 'Drake',
  goran: 'George',
  zoran: 'Dawn',
  vuk: 'Wolf',
  boris: 'Boris',
  jovan: 'John',
  milan: 'Miles',
  luka: 'Luke',
  marko: 'Mark',
  ioan: 'John',
  ivan: 'John',
  mihail: 'Michael',
  mikhail: 'Michael',
  petru: 'Peter',
  petar: 'Peter',
  stefan: 'Stephen',
  szczepan: 'Stephen',
  andrei: 'Andrew',
  dmitri: 'Demetrius',
  bogdan: 'Godwin',
  mircea: 'Merrick',
  stari: 'Old',
  novi: 'New',
  novo: 'New',
  gornji: 'Upper',
  dolnji: 'Lower',
  donji: 'Lower',
  bela: 'White',
  crna: 'Black',
  velika: 'Great',
  sveti: 'Saint',
  sveta: 'Saint',

  // Celtic / Gaelic
  gwilym: 'William',
  aonghas: 'Angus',
  aonghasa: 'Angus',
  eoghan: 'Owen',
  padraig: 'Patrick',
  seamus: 'James',
  cormac: 'Cormick',
  artur: 'Arthur',
  ruairidh: 'Rory',
  fionn: 'Finn',
  ciaran: 'Kieran',
  domhnall: 'Donald',
  dun: 'Fort',
  baile: 'Town',
  inis: 'Isle',
  slieve: 'Mount',
  ben: 'Peak',
  loch: 'Lake',

  // Nordic
  harald: 'Harold',
  knut: 'Canute',
  olaf: 'Olaf',
  thorstein: 'Thurstan',
  thorbjorn: 'Thorburn',
  ragnar: 'Rayner',
  bjorn: 'Bear',
  eirik: 'Eric',
  hakon: 'Haco',
  sigurd: 'Seward',
  gamla: 'Old',
  ny: 'New',
  store: 'Great',
  kald: 'Cold',
  djupe: 'Deep',
  morke: 'Dark',

  // Hellenic
  alexandros: 'Alexander',
  demetrios: 'Demetrius',
  georgios: 'George',
  ioannes: 'John',
  konstantinos: 'Constantine',
  theodoros: 'Theodore',
  nea: 'New',
  palaiopolis: 'Old City',
  megalo: 'Great',
  iero: 'Holy',
  agrio: 'Wild',

  // Levantine
  yusuf: 'Joseph',
  ibrahim: 'Abraham',
  daud: 'David',
  musa: 'Moses',
  maryam: 'Mary',
  sulayman: 'Solomon',
  tariq: 'Tarik',
  ali: 'Eli',
  tell: 'Mount',
  kfar: 'Village',
  ain: 'Springs',
  jabal: 'Mount',
  wadi: 'Canyon',
  midbar: 'Desert',
  waha: 'Oasis',
};

const TITLE_EPITHET_MAP: Record<string, string> = {
  // Danubian Slavic / Romanian
  'cel viteaz': 'the Brave',
  'cel mare': 'the Great',
  'cel batran': 'the Elder',
  'cel bătrân': 'the Elder',
  'cel bun': 'the Good',
  'cel frumos': 'the Fair',
  'cel sfant': 'the Holy',
  'cel sfânt': 'the Holy',
  'cel rau': 'the Terrible',
  'cel rău': 'the Terrible',
  'knyaz': 'Prince',
  'voivode': 'Duke',
  'voievod': 'Duke',
  'boyar': 'Baron',
  'tsar': 'Emperor',
  'veliky': 'the Great',
  'grozny': 'the Terrible',
  'mudry': 'the Wise',

  // Celtic / Gaelic
  'ruadh': 'the Red',
  'mor': 'the Great',
  'mór': 'the Great',
  'og': 'the Younger',
  'óg': 'the Younger',
  'ban': 'the Fair',
  'bán': 'the Fair',
  'dubh': 'the Black',

  // Nordic
  'hinn frodi': 'the Wise',
  'hinn fróði': 'the Wise',
  'hinn gamli': 'the Elder',
  'hinn riki': 'the Mighty',
  'hinn ríki': 'the Mighty',
  'blatann': 'Bluetooth',
  'blátönn': 'Bluetooth',
  'hardradi': 'Hardruler',
  'harðráði': 'Hardruler',
  'jarl': 'Earl',
  'konge': 'King',

  // Hellenic
  'megas': 'the Great',
  'soter': 'the Savior',
  'nikator': 'the Victorious',
  'basileus': 'King',
  'archon': 'Lord',

  // Levantine
  'al-kabir': 'the Great',
  'al-mansur': 'the Victorious',
  'al-rashid': 'the Just',
  'al-hakim': 'the Wise',
  'malik': 'King',
  'amir': 'Prince',
  'emir': 'Prince',
  'sultan': 'Sovereign',
  'sheikh': 'Elder',
};

function titleMapForCulture(cultureId?: string): Record<string, string> {
  // Slavic Ban is an office, not the Gaelic colour epithet bán.
  return cultureId === 'danubian_slavic'
    ? { ...TITLE_EPITHET_MAP, ban: 'Governor' }
    : TITLE_EPITHET_MAP;
}

/**
 * Words and English cognates that must be protected from phonetic mutation (e.g. J -> Y, double-l).
 */
const PROTECTED_ENGLISH_WORDS = new Set([
  ...Object.values(COGNATES),
  'Fitz', 'The', 'the', 'Of', 'of', 'Fort', 'Castle', 'Brave', 'Valiant', 'Great',
  'Elder', 'Good', 'Fair', 'Holy', 'Terrible', 'Prince', 'Duke', 'Baron', 'Emperor',
  'King', 'Lord', 'Wise', 'Red', 'Younger', 'Black', 'Bluetooth', 'Hardruler',
  'Earl', 'Savior', 'Victorious', 'Sovereign', 'Governor',
  // Common English names with J or double consonants
  'John', 'James', 'Joseph', 'Jack', 'Jacob', 'Jason', 'Jane', 'Joan', 'Julian', 'Justin',
  'William', 'Nicholas', 'Arthur', 'Peter', 'Walter', 'Alexander', 'Andrew', 'David',
  'Thomas', 'Robert', 'Richard', 'Edward', 'Henry', 'George', 'Charles', 'Brian', 'Aidan',
]);

// ============================================================================
// Anglicization Engine Class
// ============================================================================

export class AnglicizationEngine {
  /**
   * Anglicizes a single name string according to the requested mode and options.
   */
  anglicize(name: string, options?: AnglicizeOptions): AnglicizationResult {
    const mode = options?.mode ?? 'full';
    const cultureId = options?.cultureId;
    const category = options?.category ?? 'character';
    const originalRoot = options?.root ?? this.extractRootGuess(name);
    const originalTitle = options?.title;

    if (!name || name.trim() === '') {
      const emptyOverlay: AnglicizationOverlay = {
        enabled: true,
        mode,
        anglicizedName: '',
        anglicizedRoot: '',
        exonymDualDisplay: options?.exonymDualDisplay ?? false,
      };
      return {
        originalName: name,
        anglicizedName: '',
        anglicizedRoot: '',
        formattedDisplay: '',
        mode,
        overlay: emptyOverlay,
      };
    }

    let processed = name;
    let anglicizedRoot = originalRoot;
    let anglicizedTitle = originalTitle ? this.anglicizeTitle(originalTitle, cultureId) : undefined;

    // Apply pipeline stages
    switch (mode) {
      case 'phonetic': {
        processed = this.stage1PhoneticSmoothing(processed, cultureId);
        anglicizedRoot = this.stage1PhoneticSmoothing(originalRoot, cultureId);
        break;
      }
      case 'suffix': {
        processed = this.stage2SuffixLocalization(processed, cultureId, category);
        anglicizedRoot = this.stage2SuffixLocalization(originalRoot, cultureId, category);
        break;
      }
      case 'full':
      default: {
        const fullRes = this.stage3FullLocalization(processed, cultureId, originalRoot, originalTitle, category);
        processed = fullRes.name;
        anglicizedRoot = fullRes.root;
        if (fullRes.title) {
          anglicizedTitle = fullRes.title;
        }
        break;
      }
    }

    processed = this.sanitizeArticles(processed);
    if (anglicizedTitle) {
      anglicizedTitle = this.sanitizeArticles(anglicizedTitle);
    }

    // Build dual display formatting
    const exonymDualDisplay = options?.exonymDualDisplay ?? false;
    let formattedDisplay = processed;
    if (exonymDualDisplay && name !== processed) {
      if (category === 'settlement' || category === 'geography') {
        formattedDisplay = `${name} / ${processed}`;
      } else {
        formattedDisplay = `${name} (${processed})`;
      }
    }

    const overlay: AnglicizationOverlay = {
      enabled: true,
      mode,
      anglicizedName: processed,
      anglicizedRoot,
      anglicizedTitle,
      exonymDualDisplay,
      phoneticApproximation: this.stage1PhoneticSmoothing(name, cultureId),
    };

    return {
      originalName: name,
      anglicizedName: processed,
      anglicizedRoot,
      anglicizedTitle,
      formattedDisplay,
      mode,
      overlay,
    };
  }

  /**
   * Applies reversible Anglicization to a LoreEntity, mutating a clone and setting overlay.
   * Derives transformations from originalName and originalRoot to ensure idempotency.
   */
  anglicizeEntity(entity: LoreEntity, options?: AnglicizeOptions): LoreEntity {
    const baseName = entity.originalName ?? entity.name;
    const baseRoot = entity.originalRoot ?? entity.rootName ?? entity.name;
    const hasSavedEpithet = Object.prototype.hasOwnProperty.call(entity.metadata ?? {}, '_originalEpithet');
    const origEpithet = hasSavedEpithet
      ? (entity.metadata!._originalEpithet as string | null | undefined) ?? undefined
      : entity.epithet;
    const epithetPresent = hasSavedEpithet
      ? entity.metadata!._originalEpithetPresent !== false
      : Object.prototype.hasOwnProperty.call(entity, 'epithet');
    const baseTitle = entity.originalTitle ?? origEpithet;

    const opts: AnglicizeOptions = {
      ...options,
      cultureId: options?.cultureId ?? entity.cultureId,
      category: entity.category,
      root: baseRoot,
      title: baseTitle,
    };

    const result = this.anglicize(baseName, opts);

    return {
      ...entity,
      name: result.anglicizedName,
      rootName: result.anglicizedRoot,
      originalName: baseName,
      originalRoot: baseRoot,
      originalTitle: entity.originalTitle,
      epithet: result.anglicizedTitle ?? origEpithet,
      metadata: {
        ...entity.metadata,
        _originalEpithet: origEpithet ?? null,
        _originalEpithetPresent: epithetPresent,
      },
      anglicization: result.overlay,
    };
  }

  /**
   * Losslessly reverts an Anglicized LoreEntity back to its original historical baseline.
   */
  revert(entity: LoreEntity): LoreEntity {
    const revertedOverlay: AnglicizationOverlay = entity.anglicization
      ? {
          ...entity.anglicization,
          enabled: false,
        }
      : {
          enabled: false,
          mode: 'phonetic',
          anglicizedName: entity.name,
          anglicizedRoot: entity.rootName ?? entity.originalRoot ?? entity.name,
          exonymDualDisplay: false,
        };

    const hasSavedEpithet = Object.prototype.hasOwnProperty.call(entity.metadata ?? {}, '_originalEpithet');
    const origEpithet = hasSavedEpithet
      ? (entity.metadata!._originalEpithet as string | null | undefined) ?? undefined
      : entity.epithet;
    const epithetPresent = hasSavedEpithet
      ? entity.metadata!._originalEpithetPresent !== false
      : Object.prototype.hasOwnProperty.call(entity, 'epithet');
    const cleanMetadata = entity.metadata ? { ...entity.metadata } : undefined;
    if (cleanMetadata && '_originalEpithet' in cleanMetadata) {
      delete cleanMetadata._originalEpithet;
      delete cleanMetadata._originalEpithetPresent;
    }

    const reverted = {
      ...entity,
      name: entity.originalName ?? entity.name,
      rootName: entity.originalRoot ?? entity.rootName,
      originalName: entity.originalName ?? entity.name,
      originalRoot: entity.originalRoot ?? entity.rootName ?? entity.name,
      originalTitle: entity.originalTitle,
      epithet: origEpithet,
      metadata: cleanMetadata,
      anglicization: revertedOverlay,
    };
    if (!epithetPresent) delete reverted.epithet;
    return reverted;
  }

  /**
   * Formats the display name for a LoreEntity taking exonym / endonym dual display into account.
   */
  formatDisplay(entity: LoreEntity): string {
    if (entity.anglicization?.enabled && entity.anglicization.exonymDualDisplay) {
      const original = entity.originalName;
      const current = entity.name;
      if (original && original !== current) {
        if (entity.category === 'settlement' || entity.category === 'geography') {
          return `${original} / ${current}`;
        }
        return `${original} (${current})`;
      }
    }
    return entity.name;
  }

  // ==========================================================================
  // Pipeline Stage Implementations
  // ==========================================================================

  /**
   * Stage 1: Phonetic Smoothing
   * Replaces non-English consonant/vowel clusters and diacritics.
   */
  private stage1PhoneticSmoothing(text: string, cultureId?: string): string {
    if (!text) return '';

    let res = text;

    // Apply diacritic replacements first
    for (const [char, replacement] of Object.entries(DIACRITIC_MAP)) {
      if (res.includes(char)) {
        res = res.split(char).join(replacement);
      }
    }

    // Apply cluster mappings
    for (const { pattern, replacement } of PHONETIC_CLUSTERS) {
      res = res.replace(pattern, (match) => {
        // Match casing
        if (match[0] === match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement.toLowerCase();
      });
    }

    // Slavic/Nordic J to Y (when consonant)
    if (cultureId !== 'levantine_semitic' && !PROTECTED_ENGLISH_WORDS.has(res)) {
      // Word initial J followed by vowel: Jan -> Yan, Jovan -> Yovan
      res = res.replace(/\bJ([aeiouyAEIOUY])/g, 'Y$1');
      res = res.replace(/\bj([aeiouy])/g, 'y$1');

      // Medial j after consonant or vowel: Bjorn -> Byorn, Fjord -> Fyord, Maja -> Maya
      res = res.replace(/([bcdfghklmnprstvwxzBCDFGHKLMNPRSTVWXZ])j([aeiouy])/g, '$1y$2');
      res = res.replace(/([aeiouy])j([aeiouy])/g, '$1y$2');

      // Pre-consonantal j after vowel: Vojtech -> Voytech, Bojko -> Boyko, Majka -> Mayka
      res = res.replace(/([aeiouy])j([bcdfghklmnpqrstvwxz])/gi, '$1y$2');

      // Word final -aj, -ej, -oj, -uj -> -ay, -ey, -oy, -uy
      res = res.replace(/([aeou])j\b/gi, '$1y');
    }

    if (!PROTECTED_ENGLISH_WORDS.has(res)) {
      // Slavic word-final -mir -> -mere
      res = res.replace(/([A-Za-z]{2,})mir\b/gi, '$1mere');
      // Greek ph -> f, rh -> r
      res = res.replace(/ph/gi, 'f');
      res = res.replace(/\bRh/g, 'R');
      res = res.replace(/\brh/g, 'r');
      // Levantine apostrophes / glottal stops
      res = res.replace(/['`]/g, '');
    }

    return res;
  }

  /**
   * Stage 2: Morphological & Suffix Localization
   * Translates cultural patronymic/locative suffixes.
   */
  private stage2SuffixLocalization(text: string, cultureId?: string, category?: EntityCategory): string {
    if (!text) return '';

    let res = text;

    // Handle Levantine prefixes (Al-, El-, Ibn)
    if (cultureId === 'levantine_semitic' || !cultureId) {
      res = res.replace(/\bAl-(\w+)/gi, 'The $1');
      res = res.replace(/\bEl-(\w+)/gi, 'The $1');
    }

    // Determine rules to use
    let rules: SuffixRule[] = [];
    if (cultureId && CULTURAL_SUFFIXES[cultureId]) {
      rules = CULTURAL_SUFFIXES[cultureId];
    } else {
      // Combine all rules if no specific culture provided
      rules = Object.values(CULTURAL_SUFFIXES).flat();
    }

    // If category is 'character' or not settlement/geography, exclude toponymic-only rules
    if (category !== 'settlement' && category !== 'geography') {
      rules = rules.filter((r) => !r.toponymicOnly);
    }

    // Sort rules by suffix length descending so longer suffixes match first
    const sortedRules = [...rules].sort((a, b) => b.suffix.length - a.suffix.length);

    // Apply suffix replacement word by word
    const words = res.split(/(\s+|-)/);
    const transformed = words.map((token) => {
      if (/^\s+$/.test(token) || token === '-') return token;
      if (PROTECTED_ENGLISH_WORDS.has(token) || token.startsWith('Fitz')) return token;

      for (const { suffix, replacement } of sortedRules) {
        const regex = new RegExp(`(${suffix})$`, 'i');
        if (regex.test(token)) {
          return token.replace(regex, replacement);
        }
      }
      return token;
    });

    res = transformed.join('');

    // Follow up with phonetic smoothing on remainder
    return this.stage1PhoneticSmoothing(res, cultureId);
  }

  /**
   * Stage 3: Full Anglo-Norman / Archaic Localization
   * Handles patronymic prefixing (Fitz-, Beau-, de), cognates, and archaic honorifics.
   */
  private stage3FullLocalization(
    text: string,
    cultureId?: string,
    originalRoot?: string,
    originalTitle?: string,
    category?: EntityCategory,
  ): { name: string; root: string; title?: string } {
    if (!text) return { name: '', root: '' };

    let current = text;
    let detectedTitle = originalTitle;

    // 1. Check for Celtic/Nordic/Slavic/Levantine settlements & landmarks
    const dunMatch = current.match(/\bDun\s+([A-Za-z]+)\b/i);
    if (dunMatch) {
      const stem = dunMatch[1];
      const anglicizedStem = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      current = current.replace(/\bDun\s+[A-Za-z]+\b/i, `${anglicizedStem} Fort`);
    }

    current = current.replace(/\bBaile\s+([A-Za-z]+)\b/gi, (_m, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `${anglicized} Town`;
    });
    current = current.replace(/\bInis\s+([A-Za-z]+)\b/gi, (_m, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `${anglicized} Isle`;
    });
    current = current.replace(/\b(Tell|Jabal|Har|Slieve|Ben)\s+([A-Za-z]+)\b/gi, (_m, _pfx, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `Mount ${anglicized}`;
    });
    current = current.replace(/\bKfar\s+([A-Za-z]+)\b/gi, (_m, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `${anglicized} Village`;
    });
    current = current.replace(/\b(Stari|Gamla)\s+([A-Za-z]+)\b/gi, (_m, _pfx, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `Old ${anglicized}`;
    });
    current = current.replace(/\b(Novi|Novo|Ny|Nea)\s+([A-Za-z]+)\b/gi, (_m, _pfx, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `New ${anglicized}`;
    });
    current = current.replace(/\bLoch\s+([A-Za-z]+)\b/gi, (_m, stem) => {
      const anglicized = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      return `Lake ${anglicized}`;
    });

    // 2. Anglo-Norman Patronymics:
    // Celtic "ap / ab [Name]" -> "Fitz[Name]"
    current = current.replace(/\b(ap|ab)\s+([A-Za-z]+)\b/gi, (_match, _prefix, father) => {
      const anglicizedFather = this.translateCognate(father) ?? father;
      return `Fitz${anglicizedFather}`;
    });

    // Gaelic "Mac / Mc [Name]" / "Nic [Name]" -> "Fitz[Name]" (precise regex requiring [A-Z] or whitespace)
    current = current.replace(/\b(?:(Mac|Mc)(?=[A-Z])|(Mac|Mc|Nic)\s+)([A-Za-z]+)\b/g, (_match, _p1, _p2, father) => {
      const fatherStr = (father ?? '') as string;
      const anglicizedFather = this.translateCognate(fatherStr) ?? fatherStr;
      return `Fitz${anglicizedFather}`;
    });

    // Levantine "Ibn / Bin [Name]" -> "Fitz[Name]"
    current = current.replace(/\b(Ibn|Bin)\s+([A-Za-z]+)\b/gi, (_match, _prefix, father) => {
      const anglicizedFather = this.translateCognate(father) ?? father;
      return `Fitz${anglicizedFather}`;
    });

    // 3. Check for Title / Epithet within the name or passed explicitly
    for (const [foreignTitle, englishTitle] of Object.entries(titleMapForCulture(cultureId))) {
      const titleRegex = new RegExp(`\\b${foreignTitle}\\b`, 'gi');
      if (titleRegex.test(current)) {
        current = current.replace(titleRegex, englishTitle);
        detectedTitle = englishTitle;
      }
    }
    current = this.sanitizeArticles(current);

    // 4. Translate known cognates and roots
    const words = current.split(/(\s+|-)/);
    const localizedWords = words.map((word) => {
      if (/^\s+$/.test(word) || word === '-' || word.startsWith('Fitz') || PROTECTED_ENGLISH_WORDS.has(word)) return word;
      const lower = word.toLowerCase();
      if (COGNATES[lower]) {
        return COGNATES[lower];
      }
      return word;
    });
    current = localizedWords.join('');

    // 5. Apply Suffix Localization & Phonetic Smoothing ONLY on unprotected remaining segments
    const tokens = current.split(/(\s+|-)/);
    const processedTokens = tokens.map((token) => {
      if (/^\s+$/.test(token) || token === '-' || token.startsWith('Fitz') || PROTECTED_ENGLISH_WORDS.has(token)) {
        return token;
      }
      return this.stage2SuffixLocalization(token, cultureId, category);
    });
    current = processedTokens.join('');

    // Compute anglicized root
    let root = originalRoot ?? this.extractRootGuess(text);
    const rootLower = root.toLowerCase();
    if (COGNATES[rootLower]) {
      root = COGNATES[rootLower];
    } else if (!PROTECTED_ENGLISH_WORDS.has(root)) {
      root = this.stage2SuffixLocalization(root, cultureId, category);
    }

    const title = detectedTitle ? this.anglicizeTitle(detectedTitle, cultureId) : undefined;

    return {
      name: this.sanitizeArticles(current),
      root,
      title,
    };
  }

  /**
   * Sanitizes duplicate consecutive articles (e.g. 'the the', 'The the', 'the of the')
   */
  private sanitizeArticles(text: string): string {
    if (!text) return text;
    return text
      .replace(/\bthe\s+(of\s+the)\b/gi, '$1')
      .replace(/\b([Tt]he|[Aa]n?)(?:\s+(?:the|a|an))+\b/gi, (match) => match.split(/\s+/)[0])
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Translates a title or epithet to its archaic English equivalent.
   */
  private anglicizeTitle(title: string, cultureId?: string): string {
    const lower = title.toLowerCase().trim();
    const titleMap = titleMapForCulture(cultureId);
    if (titleMap[lower]) {
      return this.sanitizeArticles(titleMap[lower]);
    }
    for (const [foreign, english] of Object.entries(titleMap)) {
      const pattern = new RegExp(`(^|[^\\p{L}])${foreign}(?=$|[^\\p{L}])`, 'giu');
      if (pattern.test(title)) {
        return this.sanitizeArticles(title.replace(pattern, (_match, prefix: string) => prefix + english));
      }
    }
    return this.sanitizeArticles(title);
  }

  /**
   * Translates a known historical cognate if available.
   */
  private translateCognate(name: string): string | undefined {
    const lower = name.toLowerCase().trim();
    return COGNATES[lower];
  }

  /**
   * Helper to extract a root name guess from a full name (first word or stem).
   */
  private extractRootGuess(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts[0] || name;
  }
}
