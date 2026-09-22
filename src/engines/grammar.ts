/**
 * Recursive Template & Context-Free Grammar (CFG) Engine
 *
 * Supports bracket alternation syntax [OptionA|OptionB],
 * Markov chain hooks {Markov:Category},
 * contextual parent inheritance {Parent.root}, {Parent.name},
 * user custom variables {Title},
 * culture lexical seed interpolation {given_names_masculine}, {orogeny.stems}, etc.,
 * and recursive resolution up to maxDepth (default 5) with cycle protection.
 */

import { MarkovNameGenerator, MarkovGenerationError } from './markov';
import { cacheModel } from './modelCache';
import type {
  CultureProfile,
  CultureLexicon,
  GeographicLexicon,
  LoreEntity,
  Gender,
  GeographicFeatureType,
} from '../types/domain';

export interface GrammarParentContext {
  root?: string;
  name?: string;
  originalRoot?: string;
  originalName?: string;
  [key: string]: unknown;
}

export interface GrammarContext {
  culture?: CultureProfile | CultureLexicon | Record<string, unknown>;
  parent?: GrammarParentContext | LoreEntity;
  customVariables?: Record<string, string | number | string[]>;
  markov?: MarkovNameGenerator;
  markovGenerators?: Record<string, MarkovNameGenerator>;
  gender?: Gender;
  featureSubtype?: GeographicFeatureType;
  temperature?: number;
  markovOrder?: number;
  randomFn?: () => number;
}

export interface GrammarEngineOptions {
  markov?: MarkovNameGenerator;
  markovGenerators?: Record<string, MarkovNameGenerator>;
  culture?: CultureProfile | CultureLexicon | Record<string, unknown>;
  maxDepth?: number;
  temperature?: number;
  randomFn?: () => number;
}

export class RecursiveGrammarEngine {
  readonly maxDepth: number;
  private readonly defaultMarkov?: MarkovNameGenerator;
  private readonly markovGenerators: Map<string, MarkovNameGenerator> = new Map();
  private readonly culture?: CultureProfile | CultureLexicon | Record<string, unknown>;
  private readonly randomFn?: () => number;
  private readonly cultureMarkovCache: Map<string, MarkovNameGenerator> = new Map();

  constructor(options?: GrammarEngineOptions) {
    this.maxDepth = Math.max(1, options?.maxDepth ?? 5);
    this.defaultMarkov = options?.markov;
    this.culture = options?.culture;
    this.randomFn = options?.randomFn;

    if (options?.markovGenerators) {
      for (const [key, gen] of Object.entries(options.markovGenerators)) {
        this.markovGenerators.set(key.toLowerCase(), gen);
      }
    }
  }

  /**
   * Random number generator between 0 and 1, using custom randomFn if provided
   */
  private getRandom(context?: GrammarContext): number {
    if (context?.randomFn) return context.randomFn();
    if (this.randomFn) return this.randomFn();
    return Math.random();
  }

  /**
   * Randomly pick an item from a list
   */
  private chooseRandom<T>(items: readonly T[], context?: GrammarContext): T | undefined {
    if (!items || items.length === 0) return undefined;
    const rand = this.getRandom(context);
    const index = Math.floor(rand * items.length);
    return items[Math.min(index, items.length - 1)];
  }

  /**
   * Resolve innermost alternation brackets: [OptionA|OptionB|OptionC]
   */
  private resolveAlternations(text: string, context?: GrammarContext): string {
    let result = text;
    let safety = 30;
    const bracketRegex = /\[([^\[\]]*)\]/g;

    while (safety > 0 && result.includes('[')) {
      safety--;
      const next = result.replace(bracketRegex, (_match, inner: string) => {
        const parts = inner.split('|');
        const chosen = this.chooseRandom(parts, context);
        return chosen !== undefined ? chosen.trim() : '';
      });
      if (next === result) {
        break;
      }
      result = next;
    }

    return result;
  }

  /**
   * Look up a parent entity property (e.g. {Parent.root} or {Parent.name})
   */
  private resolveParentToken(parentKey: string, parent?: GrammarParentContext | LoreEntity): string | undefined {
    if (!parent) return undefined;

    const trimmedKey = parentKey.trim();
    if (!trimmedKey) {
      const name = (parent as { name?: string }).name ?? (parent as { originalName?: string }).originalName;
      const root = (parent as { root?: string }).root ?? (parent as { originalRoot?: string }).originalRoot;
      return name ?? root ?? '';
    }

    const record = parent as Record<string, unknown>;

    // Exact match
    if (trimmedKey in record && record[trimmedKey] !== undefined) {
      return String(record[trimmedKey]);
    }

    // Case-insensitive match
    const lowerKey = trimmedKey.toLowerCase();
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase() === lowerKey && v !== undefined) {
        return String(v);
      }
    }

    // Fallbacks for common LoreEntity fields
    if (lowerKey === 'root') {
      const rootVal = (parent as { root?: string }).root ?? (parent as { originalRoot?: string }).originalRoot;
      if (rootVal !== undefined) return String(rootVal);
    }
    if (lowerKey === 'name') {
      const nameVal = (parent as { name?: string }).name ?? (parent as { originalName?: string }).originalName;
      if (nameVal !== undefined) return String(nameVal);
    }

    return undefined;
  }

  /**
   * Look up or train a Markov generator for a given category
   */
  private resolveMarkovToken(
    category: string,
    context?: GrammarContext,
    culture?: CultureProfile | CultureLexicon | Record<string, unknown>
  ): string {
    const cleanCategory = category.trim();
    const lowerCat = cleanCategory.toLowerCase();

    const tempOpts = {
      ...(context?.temperature !== undefined ? { temperature: context.temperature } : {}),
      randomFn: context?.randomFn ?? this.randomFn,
    };

    // 1. Check context-specific markovGenerators
    if (context?.markovGenerators) {
      for (const [k, gen] of Object.entries(context.markovGenerators)) {
        if (k.toLowerCase() === lowerCat) {
          try {
            return gen.generate(tempOpts);
          } catch (error) {
            if (!(error instanceof MarkovGenerationError)) throw error;
            // fallback
          }
        }
      }
    }

    // 2. Check engine-registered markovGenerators
    const engineGen = this.markovGenerators.get(lowerCat);
    if (engineGen) {
      try {
        return engineGen.generate(tempOpts);
      } catch (error) {
        if (!(error instanceof MarkovGenerationError)) throw error;
        // fallback
      }
    }

    // 3. Check context or engine default Markov generator
    const defaultGen = context?.markov ?? this.defaultMarkov;
    if (defaultGen) {
      try {
        return defaultGen.generate(tempOpts);
      } catch (error) {
        if (!(error instanceof MarkovGenerationError)) throw error;
        // fallback to seeds
      }
    }

    // 4. Try culture-based Markov generator creation / seeds
    if (culture) {
      const seeds = this.extractCultureSeedsForCategory(cleanCategory, culture, context);
      if (seeds && seeds.length > 0) {
        const order = context?.markovOrder ?? 2;
        const cacheKey = JSON.stringify([lowerCat, context?.gender, order, seeds]);
        let cached = this.cultureMarkovCache.get(cacheKey);
        if (!cached) {
          cached = new MarkovNameGenerator(seeds, { order });
          cacheModel(this.cultureMarkovCache, cacheKey, cached);
        }
        if (cached) {
          try {
            return cached.generate(tempOpts);
          } catch (error) {
            if (!(error instanceof MarkovGenerationError)) throw error;
            // generation failed, pick random seed
            const pick = this.chooseRandom(seeds, context);
            if (pick) return pick;
          }
        } else {
          const pick = this.chooseRandom(seeds, context);
          if (pick) return pick;
        }
      }
    }

    return cleanCategory;
  }

  /**
   * Extract seeds from culture matching a semantic Markov category
   */
  private extractCultureSeedsForCategory(
    category: string,
    culture: CultureProfile | CultureLexicon | Record<string, unknown>,
    context?: GrammarContext
  ): string[] | undefined {
    const lower = category.toLowerCase();
    const seeds = (culture as CultureProfile).seeds ?? (culture as Record<string, unknown>);
    const geo = (culture as CultureProfile).geographic_lexicon ?? ((culture as Record<string, unknown>).geographic_lexicon as GeographicLexicon | undefined);

    if (lower.includes('settlement')) {
      const settlementSeeds = (seeds as CultureLexicon).settlement_roots;
      if (Array.isArray(settlementSeeds) && settlementSeeds.length > 0) return settlementSeeds;
    }

    if (lower.includes('masculine') || lower === 'male') {
      const masc = (seeds as CultureLexicon).given_names_masculine;
      if (Array.isArray(masc) && masc.length > 0) return masc;
    }

    if (lower.includes('feminine') || lower === 'female') {
      const fem = (seeds as CultureLexicon).given_names_feminine;
      if (Array.isArray(fem) && fem.length > 0) return fem;
    }

    if (lower.includes('person') || lower.includes('character') || lower.includes('given')) {
      const gender = context?.gender;
      if (gender === 'masculine' && (seeds as CultureLexicon).given_names_masculine?.length) {
        return (seeds as CultureLexicon).given_names_masculine;
      }
      if (gender === 'feminine' && (seeds as CultureLexicon).given_names_feminine?.length) {
        return (seeds as CultureLexicon).given_names_feminine;
      }
      const masc = (seeds as CultureLexicon).given_names_masculine ?? [];
      const fem = (seeds as CultureLexicon).given_names_feminine ?? [];
      const combined = [...masc, ...fem];
      if (combined.length > 0) return combined;
    }

    if (lower.includes('surname') || lower.includes('family')) {
      const sur = (seeds as CultureLexicon).surnames;
      if (Array.isArray(sur) && sur.length > 0) return sur;
    }

    if (lower.includes('orogeny') && geo?.orogeny?.stems) {
      return geo.orogeny.stems;
    }
    if (lower.includes('hydrology') && geo?.hydrology?.stems) {
      return geo.hydrology.stems;
    }
    if (lower.includes('wilds') && geo?.wilds?.stems) {
      return geo.wilds.stems;
    }

    return undefined;
  }

  /**
   * Resolve culture lexical tokens, shorthand tokens, and dotted paths
   */
  private resolveCultureToken(
    token: string,
    culture: CultureProfile | CultureLexicon | Record<string, unknown>,
    context?: GrammarContext
  ): string | undefined {
    const rawCulture = culture as Record<string, unknown>;
    const seeds = ((rawCulture.seeds as Record<string, unknown>) ?? rawCulture) as Record<string, unknown>;
    const geo = (rawCulture.geographic_lexicon ?? rawCulture.geographicLexicon) as Record<string, Record<string, string[]>> | undefined;

    const lowerToken = token.toLowerCase();

    // Check if Markov innovation is activated by temperature (> 0.4)
    const temp = context?.temperature ?? 0.7;
    const shouldInnovate =
      Boolean(context?.markov) &&
      context?.temperature !== undefined &&
      context.temperature > 0.4 &&
      this.getRandom(context) < (context.temperature - 0.35) * 0.7;

    // 1. Shorthand mappings
    if (lowerToken === 'given' || lowerToken === 'given_name') {
      // A generic/blended model has no gender guarantee; explicit gender stays typed.
      if (shouldInnovate && context?.markov && (!context.gender || context.gender === 'any')) {
        try {
          const gen = context.markov.generate({ temperature: temp, randomFn: context.randomFn ?? this.randomFn });
          if (gen && gen.length >= 3 && !gen.includes('{')) return gen;
        } catch (error) {
          if (!(error instanceof MarkovGenerationError)) throw error;
          // fallback to static seeds
        }
      }
      const gender = context?.gender;
      const masc = (seeds.given_names_masculine as string[]) ?? [];
      const fem = (seeds.given_names_feminine as string[]) ?? [];
      if (gender === 'feminine' && fem.length > 0) {
        return this.chooseRandom(fem, context);
      }
      if (gender === 'masculine' && masc.length > 0) {
        return this.chooseRandom(masc, context);
      }
      const all = [...masc, ...fem];
      if (all.length > 0) return this.chooseRandom(all, context);
    }

    if (lowerToken === 'surname') {
      if (shouldInnovate && context?.markov) {
        try {
          const gen = context.markov.generate({ temperature: temp, randomFn: context.randomFn ?? this.randomFn });
          if (gen && gen.length >= 3 && !gen.includes('{')) return gen;
        } catch (error) {
          if (!(error instanceof MarkovGenerationError)) throw error;
          // fallback to static seeds
        }
      }
      const sur = seeds.surnames as string[] | undefined;
      if (Array.isArray(sur) && sur.length > 0) return this.chooseRandom(sur, context);
    }

    if (lowerToken === 'settlement' || lowerToken === 'settlement_root') {
      if (shouldInnovate && context?.markov) {
        try {
          const gen = context.markov.generate({ temperature: temp, randomFn: context.randomFn ?? this.randomFn });
          if (gen && gen.length >= 3 && !gen.includes('{')) return gen;
        } catch (error) {
          if (!(error instanceof MarkovGenerationError)) throw error;
          // fallback to static seeds
        }
      }
      const setRoots = seeds.settlement_roots as string[] | undefined;
      if (Array.isArray(setRoots) && setRoots.length > 0) return this.chooseRandom(setRoots, context);
    }

    if (lowerToken === 'title' || lowerToken === 'honorific_title') {
      const titles = seeds.honorific_titles as string[] | undefined;
      if (Array.isArray(titles) && titles.length > 0) return this.chooseRandom(titles, context);
    }

    if (lowerToken === 'epithet') {
      const eps = seeds.epithets as string[] | undefined;
      if (Array.isArray(eps) && eps.length > 0) return this.chooseRandom(eps, context);
    }

    if (lowerToken === 'prefix') {
      const pfx = seeds.prefixes as string[] | undefined;
      if (Array.isArray(pfx) && pfx.length > 0) return this.chooseRandom(pfx, context);
    }

    if (lowerToken === 'suffix') {
      const subtype = context?.featureSubtype;
      if (subtype && geo?.[subtype]?.suffixes?.length) {
        return this.chooseRandom(geo[subtype].suffixes, context);
      }
      const sfx = seeds.suffixes as string[] | undefined;
      if (Array.isArray(sfx) && sfx.length > 0) return this.chooseRandom(sfx, context);

      const allSuffixes = [
        ...(geo?.orogeny?.suffixes ?? []),
        ...(geo?.hydrology?.suffixes ?? []),
        ...(geo?.wilds?.suffixes ?? []),
      ];
      if (allSuffixes.length > 0) return this.chooseRandom(allSuffixes, context);
    }

    if (lowerToken === 'stem') {
      const subtype = context?.featureSubtype;
      if (subtype && geo?.[subtype]?.stems?.length) {
        return this.chooseRandom(geo[subtype].stems, context);
      }
      const allStems = [
        ...(geo?.orogeny?.stems ?? []),
        ...(geo?.hydrology?.stems ?? []),
        ...(geo?.wilds?.stems ?? []),
      ];
      if (allStems.length > 0) return this.chooseRandom(allStems, context);
    }

    if (lowerToken === 'root') {
      const setRoots = seeds.settlement_roots as string[] | undefined;
      if (Array.isArray(setRoots) && setRoots.length > 0) return this.chooseRandom(setRoots, context);
    }

    if (lowerToken === 'orogeny' && geo?.orogeny?.stems?.length) {
      return this.chooseRandom(geo.orogeny.stems, context);
    }
    if (lowerToken === 'hydrology' && geo?.hydrology?.stems?.length) {
      return this.chooseRandom(geo.hydrology.stems, context);
    }
    if (lowerToken === 'wilds' && geo?.wilds?.stems?.length) {
      return this.chooseRandom(geo.wilds.stems, context);
    }

    // 2. Direct key in seeds
    if (token in seeds && Array.isArray(seeds[token])) {
      return this.chooseRandom(seeds[token] as string[], context);
    }

    // 3. Direct key in culture
    if (token in rawCulture && Array.isArray(rawCulture[token])) {
      return this.chooseRandom(rawCulture[token] as string[], context);
    }

    // 4. Dotted path resolution (e.g. orogeny.stems or geographic_lexicon.hydrology.suffixes)
    const parts = token.split('.');
    if (geo && parts.length === 2 && geo[parts[0]] && Array.isArray(geo[parts[0]][parts[1]])) {
      return this.chooseRandom(geo[parts[0]][parts[1]], context);
    }
    if (parts.length === 2 && seeds[parts[0]] && typeof seeds[parts[0]] === 'object') {
      const sub = seeds[parts[0]] as Record<string, unknown>;
      if (Array.isArray(sub[parts[1]])) {
        return this.chooseRandom(sub[parts[1]] as string[], context);
      }
    }

    // 5. Deep property traversal on culture
    let current: unknown = rawCulture;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (Array.isArray(current) && current.length > 0) {
      return this.chooseRandom(current as string[], context);
    }
    if (typeof current === 'string' || typeof current === 'number') {
      return String(current);
    }

    return undefined;
  }

  /**
   * Resolve tokens inside curly braces: {token}
   */
  private resolveTokens(text: string, context?: GrammarContext): string {
    const tokenRegex = /\{([^{}]+)\}/g;
    const culture = context?.culture ?? this.culture;

    return text.replace(tokenRegex, (match, rawToken: string) => {
      const token = rawToken.trim();

      // 1. User custom variables have highest priority
      if (context?.customVariables) {
        const lowerToken = token.toLowerCase();
        // Semantic aliases select typed custom pools without erasing gender/domain.
        const typedKeys = lowerToken === 'given' || lowerToken === 'given_name'
          ? context.gender && context.gender !== 'any'
            ? [`given_names_${context.gender}`]
            : ['given_names_masculine', 'given_names_feminine']
          : lowerToken === 'stem'
            ? context.featureSubtype ? [context.featureSubtype] : ['orogeny', 'hydrology', 'wilds']
            : [];
        const typedValues = typedKeys.flatMap((key) => {
          const value = context.customVariables?.[key];
          return Array.isArray(value) ? value : [];
        });
        if (typedValues.length && !Object.keys(context.customVariables).some((key) => key.toLowerCase() === lowerToken)) {
          return this.chooseRandom(typedValues, context) ?? '';
        }
        if (token in context.customVariables) {
          const val = context.customVariables[token];
          if (Array.isArray(val)) {
            const picked = this.chooseRandom(val, context);
            return picked !== undefined ? String(picked) : '';
          }
          return String(val ?? '');
        }

        // Case-insensitive lookup in customVariables
        const lower = token.toLowerCase();
        for (const [k, v] of Object.entries(context.customVariables)) {
          if (k.toLowerCase() === lower) {
            if (Array.isArray(v)) {
              const picked = this.chooseRandom(v, context);
              return picked !== undefined ? String(picked) : '';
            }
            return String(v ?? '');
          }
        }
      }

      // 2. Parent context hook: {Parent.root}, {Parent.name}
      if (token.toLowerCase().startsWith('parent.') || token.toLowerCase() === 'parent') {
        const parentKey = token.includes('.') ? token.slice(token.indexOf('.') + 1) : '';
        const parentVal = this.resolveParentToken(parentKey, context?.parent);
        if (parentVal !== undefined) {
          return parentVal;
        }
      }

      // 3. Markov hook: {Markov:Category} or {Markov}
      if (token.toLowerCase().startsWith('markov:') || token.toLowerCase() === 'markov') {
        const category = token.includes(':') ? token.slice(token.indexOf(':') + 1) : '';
        return this.resolveMarkovToken(category, context, culture);
      }

      // 4. Culture lexicon lookup
      if (culture) {
        const cultureVal = this.resolveCultureToken(token, culture, context);
        if (cultureVal !== undefined) {
          return cultureVal;
        }
      }

      // If token could not be resolved, retain original token
      return match;
    });
  }

  /**
   * Clean up double spaces, punctuation spacing, redundant articles, and trim whitespace
   */
  private cleanWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\bthe\s+(of\s+the)\b/gi, '$1')
      .replace(/\b([Tt]he|[Aa]n?)(?:\s+(?:the|a|an))+\b/gi, (match) => match.split(/\s+/)[0])
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim();
  }

  /**
   * Resolve a grammar template recursively up to maxDepth with loop protection
   */
  resolve(template: string, context?: GrammarContext): string {
    if (!template) return '';

    let current = template;
    const seen = new Set<string>();

    for (let depth = 0; depth < this.maxDepth; depth++) {
      if (seen.has(current)) {
        break; // Cycle detected
      }
      seen.add(current);

      const prev = current;
      current = this.resolveAlternations(current, context);
      current = this.resolveTokens(current, context);

      // Early break if string is stable
      if (current === prev) {
        break;
      }

      // Early break if no more tokens or alternations remain
      if (!current.includes('[') && !current.includes('{')) {
        break;
      }
    }

    return this.cleanWhitespace(current);
  }
}
