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

  // Celtic mutations
  { pattern: /bh/gi, replacement: 'v' },
  { pattern: /mh/gi, replacement: 'v' },
  { pattern: /\bLl/g, replacement: 'L' },
  { pattern: /ll/gi, replacement: 'l' },

  // Q without U to K, lone Q to K
  { pattern: /q(?=[^u]|$)/gi, replacement: 'k' },
];

/**
 * Diacritics mapping for authentic historical orthographies
 */
const DIACRITIC_MAP: Record<string, string> = {
  č: 'ch', Č: 'Ch',
  ć: 'ch', Ć: 'Ch',
  š: 'sh', Š: 'Sh',
  ž: 'zh', Ž: 'Zh',
  đ: 'd',  Đ: 'D',
  ł: 'l',  Ł: 'L',
  ń: 'n',  Ń: 'N',
  ś: 'sh', Ś: 'Sh',
  ź: 'z',  Ź: 'Z',
  ż: 'z',  Ż: 'Z',
  ș: 'sh', Ș: 'Sh',
  ț: 'ts', Ț: 'Ts',
  ă: 'a',  Ă: 'A',
  î: 'i',  Î: 'I',
  â: 'a',  Â: 'A',
  ä: 'a',  Ä: 'A',
  ö: 'o',  Ö: 'O',
  ü: 'u',  Ü: 'U',
  å: 'a',  Å: 'A',
  æ: 'ae', Æ: 'Ae',
  ø: 'o',  Ø: 'O',
  ð: 'd',  Ð: 'D',
  þ: 'th', Þ: 'Th',
  á: 'a',  Á: 'A',
  é: 'e',  É: 'E',
  í: 'i',  Í: 'I',
  ó: 'o',  Ó: 'O',
  ú: 'u',  Ú: 'U',
  ý: 'y',  Ý: 'Y',
};

// ============================================================================
// Stage 2: Morphological & Suffix Localization Mappings
// ============================================================================

interface SuffixRule {
  suffix: string;
  replacement: string;
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
    { suffix: 'ova', replacement: 'ford' },
    { suffix: 'eva', replacement: 'ford' },
    { suffix: 'ov', replacement: 'ford' },
    { suffix: 'ev', replacement: 'ford' },
  ],
  celtic_gaelic: [
    { suffix: 'ach', replacement: 'ock' },
    { suffix: 'oc', replacement: 'en' },
    { suffix: 'og', replacement: 'en' },
    { suffix: 'an', replacement: 'ham' },
    { suffix: 'in', replacement: 'ham' },
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
  ],
  greco_aegean: [
    { suffix: 'eios', replacement: 'e' },
    { suffix: 'ios', replacement: 'e' },
    { suffix: 'os', replacement: 'us' },
    { suffix: 'on', replacement: 'field' },
    { suffix: 'as', replacement: 'e' },
    { suffix: 'is', replacement: 'y' },
  ],
  levantine_semitic: [
    { suffix: 'awi', replacement: 'ite' },
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

  // Celtic / Gaelic
  gwilym: 'William',
  aonghas: 'Angus',
  aonghasa: 'Angus',
  eoghan: 'Owen',
  padraig: 'Patrick',
  seamus: 'James',
  cormac: 'Cormick',
  artur: 'Arthur',

  // Nordic
  harald: 'Harold',
  knut: 'Canute',
  olaf: 'Olaf',
  thorstein: 'Thurstan',
  hakon: 'Haco',
  sigurd: 'Seward',

  // Hellenic
  alexandros: 'Alexander',
  demetrios: 'Demetrius',
  georgios: 'George',
  ioannes: 'John',
  konstantinos: 'Constantine',
  theodoros: 'Theodore',

  // Levantine
  yusuf: 'Joseph',
  ibrahim: 'Abraham',
  daud: 'David',
  musa: 'Moses',
  maryam: 'Mary',
  sulayman: 'Solomon',
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
    let anglicizedTitle = originalTitle ? this.anglicizeTitle(originalTitle) : undefined;

    // Apply pipeline stages
    switch (mode) {
      case 'phonetic': {
        processed = this.stage1PhoneticSmoothing(processed, cultureId);
        anglicizedRoot = this.stage1PhoneticSmoothing(originalRoot, cultureId);
        break;
      }
      case 'suffix': {
        processed = this.stage2SuffixLocalization(processed, cultureId);
        anglicizedRoot = this.stage2SuffixLocalization(originalRoot, cultureId);
        break;
      }
      case 'full':
      default: {
        const fullRes = this.stage3FullLocalization(processed, cultureId, originalRoot, originalTitle);
        processed = fullRes.name;
        anglicizedRoot = fullRes.root;
        if (fullRes.title) {
          anglicizedTitle = fullRes.title;
        }
        break;
      }
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
   */
  anglicizeEntity(entity: LoreEntity, options?: AnglicizeOptions): LoreEntity {
    const opts: AnglicizeOptions = {
      ...options,
      cultureId: options?.cultureId ?? entity.cultureId,
      category: entity.category,
      root: entity.rootName ?? entity.originalRoot,
      title: entity.originalTitle ?? entity.epithet,
    };

    const result = this.anglicize(entity.name, opts);

    return {
      ...entity,
      name: result.anglicizedName,
      rootName: result.anglicizedRoot,
      originalName: entity.originalName ?? entity.name,
      originalRoot: entity.originalRoot ?? entity.rootName ?? entity.name,
      originalTitle: entity.originalTitle ?? entity.epithet,
      epithet: result.anglicizedTitle ?? entity.epithet,
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

    return {
      ...entity,
      name: entity.originalName ?? entity.name,
      rootName: entity.originalRoot ?? entity.rootName,
      originalName: entity.originalName ?? entity.name,
      originalRoot: entity.originalRoot ?? entity.rootName ?? entity.name,
      originalTitle: entity.originalTitle,
      epithet: entity.originalTitle ?? entity.epithet,
      anglicization: revertedOverlay,
    };
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
    if (cultureId !== 'levantine_semitic') {
      // Word initial J followed by vowel: Jan -> Yan, Jovan -> Yovan
      res = res.replace(/\bJ([aeiouyAEIOUY])/g, 'Y$1');
      res = res.replace(/\bj([aeiouy])/g, 'y$1');

      // Medial j after consonant or vowel: Bjorn -> Byorn, Fjord -> Fyord, Maja -> Maya
      res = res.replace(/([bcdfghklmnprstvwxzBCDFGHKLMNPRSTVWXZ])j([aeiouy])/g, '$1y$2');
      res = res.replace(/([aeiouy])j([aeiouy])/g, '$1y$2');

      // Word final -aj, -ej, -oj, -uj -> -ay, -ey, -oy, -uy
      res = res.replace(/([aeou])j\b/gi, '$1y');
    }

    return res;
  }

  /**
   * Stage 2: Morphological & Suffix Localization
   * Translates cultural patronymic/locative suffixes.
   */
  private stage2SuffixLocalization(text: string, cultureId?: string): string {
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

    // Sort rules by suffix length descending so longer suffixes match first
    const sortedRules = [...rules].sort((a, b) => b.suffix.length - a.suffix.length);

    // Apply suffix replacement word by word
    const words = res.split(/(\s+|-)/);
    const transformed = words.map((token) => {
      if (/^\s+$/.test(token) || token === '-') return token;

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
  ): { name: string; root: string; title?: string } {
    if (!text) return { name: '', root: '' };

    let current = text;
    let detectedTitle = originalTitle;

    // 1. Check for Celtic settlements / landmarks (e.g. Dun Aonghasa -> Angus Fort)
    const dunMatch = current.match(/\bDun\s+([A-Za-z]+)\b/i);
    if (dunMatch) {
      const stem = dunMatch[1];
      const anglicizedStem = this.translateCognate(stem) ?? this.stage1PhoneticSmoothing(stem, cultureId);
      current = current.replace(/\bDun\s+[A-Za-z]+\b/i, `${anglicizedStem} Fort`);
      return {
        name: current,
        root: anglicizedStem,
        title: detectedTitle ? this.anglicizeTitle(detectedTitle) : undefined,
      };
    }

    // 2. Anglo-Norman Patronymics:
    // Celtic "ap / ab [Name]" -> "Fitz[Name]"
    current = current.replace(/\b(ap|ab)\s+([A-Za-z]+)\b/gi, (_match, _prefix, father) => {
      const anglicizedFather = this.translateCognate(father) ?? father;
      return `Fitz${anglicizedFather}`;
    });

    // Gaelic "Mac [Name]" / "Mc [Name]" / "Nic [Name]" -> "Fitz[Name]"
    current = current.replace(/\b(Mac|Mc|Nic)\s*([A-Za-z]+)\b/gi, (_match, _prefix, father) => {
      const anglicizedFather = this.translateCognate(father) ?? father;
      return `Fitz${anglicizedFather}`;
    });

    // Levantine "Ibn / Bin [Name]" -> "Fitz[Name]"
    current = current.replace(/\b(Ibn|Bin)\s+([A-Za-z]+)\b/gi, (_match, _prefix, father) => {
      const anglicizedFather = this.translateCognate(father) ?? father;
      return `Fitz${anglicizedFather}`;
    });

    // 3. Check for Title / Epithet within the name or passed explicitly
    for (const [foreignTitle, englishTitle] of Object.entries(TITLE_EPITHET_MAP)) {
      const titleRegex = new RegExp(`\\b${foreignTitle}\\b`, 'gi');
      if (titleRegex.test(current)) {
        current = current.replace(titleRegex, englishTitle);
        detectedTitle = englishTitle;
      }
    }

    // 4. Translate known cognates and roots
    const words = current.split(/(\s+|-)/);
    const localizedWords = words.map((word) => {
      if (/^\s+$/.test(word) || word === '-' || word.startsWith('Fitz')) return word;
      const lower = word.toLowerCase();
      if (COGNATES[lower]) {
        return COGNATES[lower];
      }
      return word;
    });
    current = localizedWords.join('');

    // 5. Apply Suffix Localization & Phonetic Smoothing on remaining segments
    current = this.stage2SuffixLocalization(current, cultureId);

    // Compute anglicized root
    let root = originalRoot ?? this.extractRootGuess(text);
    const rootLower = root.toLowerCase();
    if (COGNATES[rootLower]) {
      root = COGNATES[rootLower];
    } else {
      root = this.stage2SuffixLocalization(root, cultureId);
    }

    const title = detectedTitle ? this.anglicizeTitle(detectedTitle) : undefined;

    return {
      name: current,
      root,
      title,
    };
  }

  /**
   * Translates a title or epithet to its archaic English equivalent.
   */
  private anglicizeTitle(title: string): string {
    const lower = title.toLowerCase().trim();
    if (TITLE_EPITHET_MAP[lower]) {
      return TITLE_EPITHET_MAP[lower];
    }
    for (const [foreign, english] of Object.entries(TITLE_EPITHET_MAP)) {
      if (lower.includes(foreign)) {
        return lower.replace(foreign, english);
      }
    }
    return title;
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
