/**
 * Markov Chain Name Generator (Order 2 & 3 with Blending)
 *
 * Implements an n-gram Markov model with start (^) and terminal ($) tokens,
 * temperature-scaled probability sampling, phonotactic sanity checks,
 * and multi-culture weighted blending.
 */

export interface MarkovOptions {
  order?: number;
}

export interface MarkovSampleOptions {
  minLength?: number;
  maxLength?: number;
  temperature?: number;
  maxAttempts?: number;
}

export interface WeightedSeeds {
  seeds: string[];
  weight: number;
}

export class MarkovNameGenerator {
  readonly order: number;
  readonly transitions: Map<string, Map<string, number>> = new Map();
  private seeds: string[] = [];

  constructor(seeds?: string[], options?: MarkovOptions) {
    this.order = Math.max(1, options?.order ?? 2);
    if (seeds && seeds.length > 0) {
      this.train(seeds);
    }
  }

  /**
   * Train the Markov model using a list of seed names with default weight 1.0
   */
  train(seeds: string[]): void {
    this.trainWithWeights([{ seeds, weight: 1.0 }]);
  }

  /**
   * Train the Markov model with weighted seed groups for multi-culture blending
   */
  trainWithWeights(weightedSeeds: Array<{ seeds: string[]; weight: number }>): void {
    for (const group of weightedSeeds) {
      const weight = group.weight ?? 1.0;
      if (weight <= 0 || !Array.isArray(group.seeds)) {
        continue;
      }

      for (const rawSeed of group.seeds) {
        if (typeof rawSeed !== 'string') continue;
        const cleaned = rawSeed.trim().toLowerCase();
        if (cleaned.length === 0) continue;

        const trimmed = rawSeed.trim();
        if (!this.seeds.includes(trimmed)) {
          this.seeds.push(trimmed);
        }

        const prefix = '^'.repeat(this.order);
        const padded = prefix + cleaned + '$';

        for (let i = 0; i <= padded.length - this.order - 1; i++) {
          const gram = padded.slice(i, i + this.order);
          const nextChar = padded[i + this.order];

          let nextMap = this.transitions.get(gram);
          if (!nextMap) {
            nextMap = new Map<string, number>();
            this.transitions.set(gram, nextMap);
          }
          nextMap.set(nextChar, (nextMap.get(nextChar) ?? 0) + weight);
        }
      }
    }
  }

  /**
   * Clear all trained transitions and seed memories
   */
  clear(): void {
    this.transitions.clear();
    this.seeds = [];
  }

  /**
   * Phonotactic sanity validation:
   * - Requires at least one vowel (a, e, i, o, u, y)
   * - Rejects 3+ consecutive identical consonants (e.g. bbb, sss)
   * - Rejects 3+ consecutive identical vowels (e.g. aaa, eee)
   * - Rejects unnatural consonant clusters (5+ consecutive consonants)
   */
  validatePhonotactics(name: string): boolean {
    if (!name || name.length === 0) return false;

    const lower = name.toLowerCase();

    // Must contain at least one vowel
    if (!/[aeiouy]/.test(lower)) {
      return false;
    }

    // Rejects 3+ consecutive identical consonants
    if (/([bcdfghjklmnpqrstvwxyz])\1\1/.test(lower)) {
      return false;
    }

    // Rejects 3+ consecutive identical vowels
    if (/([aeiouy])\1\1/.test(lower)) {
      return false;
    }

    // Rejects 5+ consecutive consonants
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(lower)) {
      return false;
    }

    return true;
  }

  /**
   * Sample the next character using temperature-scaled softmax:
   * P_T(c) = P(c)^(1/T) / sum(P(c')^(1/T))
   */
  private sampleNextChar(nextMap: Map<string, number>, temperature: number): string {
    const entries = Array.from(nextMap.entries());
    if (entries.length === 1) {
      return entries[0][0];
    }

    const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
    const invT = 1 / Math.max(0.01, temperature);

    let sumScaled = 0;
    const scaledEntries: Array<{ char: string; scaledProb: number }> = [];

    for (const [char, count] of entries) {
      const rawProb = count / totalCount;
      const scaledProb = Math.pow(rawProb, invT);
      scaledEntries.push({ char, scaledProb });
      sumScaled += scaledProb;
    }

    if (sumScaled === 0 || !Number.isFinite(sumScaled)) {
      let bestChar = entries[0][0];
      let maxCount = -1;
      for (const [char, count] of entries) {
        if (count > maxCount) {
          maxCount = count;
          bestChar = char;
        }
      }
      return bestChar;
    }

    const r = Math.random() * sumScaled;
    let cumulative = 0;
    for (const entry of scaledEntries) {
      cumulative += entry.scaledProb;
      if (r <= cumulative) {
        return entry.char;
      }
    }

    return scaledEntries[scaledEntries.length - 1].char;
  }

  /**
   * Sample a single candidate sequence of characters until '$' is reached
   */
  private sampleCandidate(temperature: number, maxLength: number): string | null {
    let currentGram = '^'.repeat(this.order);
    let result = '';
    const hardLimit = Math.max(maxLength * 2, 30);

    while (result.length <= hardLimit) {
      const nextMap = this.transitions.get(currentGram);
      if (!nextMap || nextMap.size === 0) {
        return null;
      }

      const nextChar = this.sampleNextChar(nextMap, temperature);
      if (nextChar === '$') {
        return result;
      }

      result += nextChar;
      currentGram = (currentGram + nextChar).slice(-this.order);
    }

    return null;
  }

  /**
   * Capitalize first character and lowercase the remainder
   */
  private formatName(name: string): string {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Generate a name satisfying length constraints and phonotactic sanity
   */
  generate(options?: MarkovSampleOptions): string {
    if (this.transitions.size === 0) {
      throw new Error('Markov chain model has not been trained with any seeds');
    }

    const minLength = options?.minLength ?? 4;
    const maxLength = options?.maxLength ?? 12;
    const temperature = options?.temperature ?? 0.7;
    const maxAttempts = options?.maxAttempts ?? 100;

    const effMin = Math.min(minLength, maxLength);
    const effMax = Math.max(minLength, maxLength);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = this.sampleCandidate(temperature, effMax);
      if (
        candidate !== null &&
        candidate.length >= effMin &&
        candidate.length <= effMax &&
        this.validatePhonotactics(candidate)
      ) {
        return this.formatName(candidate);
      }
    }

    // Fallback to trained seeds if sampling attempts exceeded
    const matchingSeeds = this.seeds.filter(
      (s) => s.length >= effMin && s.length <= effMax && this.validatePhonotactics(s)
    );
    if (matchingSeeds.length > 0) {
      const randomSeed = matchingSeeds[Math.floor(Math.random() * matchingSeeds.length)];
      return this.formatName(randomSeed);
    }

    if (this.seeds.length > 0) {
      return this.formatName(this.seeds[0]);
    }

    throw new Error('Failed to generate a valid name within constraints');
  }
}
