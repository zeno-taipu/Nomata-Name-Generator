import { describe, it, expect } from 'vitest';
import { MarkovNameGenerator } from '../src/engines/markov';

describe('MarkovNameGenerator', () => {
  const seeds = ['Branislav', 'Bogdan', 'Borivoj', 'Bratislav', 'Boleslav', 'Bojan', 'Bozidar'];

  it('trains and generates a name within length bounds', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    const name = generator.generate({ minLength: 4, maxLength: 12, temperature: 0.5 });
    expect(name.length).toBeGreaterThanOrEqual(4);
    expect(name.length).toBeLessThanOrEqual(12);
    expect(name[0]).toBe(name[0].toUpperCase());
  });

  describe('Deterministic Markov sampling', () => {
    it('supports constructor RNG and per-sample override, including seed fallback', () => {
      const model = new MarkovNameGenerator(['Amber', 'Elora'], { randomFn: () => 0 });
      expect(model.generate()).toBe('Amber');
      expect(model.generate({ randomFn: () => 0.999 })).toBe('Elora');
      expect(model.generate({ maxAttempts: 0 })).toBe('Amber');
      expect(model.generate({ maxAttempts: 0, randomFn: () => 0.999 })).toBe('Elora');
    });

    it('replays weighted training with the same seeded RNG', () => {
      const run = () => {
        let state = 91;
        const model = new MarkovNameGenerator([], {
          randomFn: () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32),
        });
        model.trainWithWeights([
          { seeds: ['Amber', 'Amara'], weight: 3 },
          { seeds: ['Elora', 'Elena'], weight: 1 },
        ]);
        return Array.from({ length: 30 }, () => model.generate());
      };
      expect(run()).toEqual(run());
      expect(new Set(run()).size).toBeGreaterThan(1);
    });
  });

  it('enforces phonotactic sanity check (no 3+ consecutive identical consonants)', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    for (let i = 0; i < 50; i++) {
      const name = generator.generate({ minLength: 4, maxLength: 14, temperature: 0.8 });
      expect(name).not.toMatch(/([bcdfghjklmnpqrstvwxyz])\1\1/i);
    }
  });

  it('supports multi-culture seed blending with weighted probabilities', () => {
    const generator = new MarkovNameGenerator([], { order: 2 });
    generator.trainWithWeights([
      { seeds: ['Alasdair', 'Angus', 'Bran', 'Caelan'], weight: 0.5 },
      { seeds: ['Bjorn', 'Einar', 'Gunnar', 'Harald'], weight: 0.5 }
    ]);
    const name = generator.generate({ minLength: 4, maxLength: 12, temperature: 0.6 });
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThanOrEqual(4);
  });

  it('works with order 3 model', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 3 });
    const name = generator.generate({ minLength: 5, maxLength: 12, temperature: 0.7 });
    expect(name.length).toBeGreaterThanOrEqual(5);
    expect(name.length).toBeLessThanOrEqual(12);
    expect(name[0]).toBe(name[0].toUpperCase());
  });

  it('validates phonotactics rejecting invalid names and accepting valid names', () => {
    const generator = new MarkovNameGenerator();
    expect(generator.validatePhonotactics('Branislav')).toBe(true);
    expect(generator.validatePhonotactics('Bogdan')).toBe(true);
    // Reject 3+ consecutive identical consonants
    expect(generator.validatePhonotactics('Abbbac')).toBe(false);
    expect(generator.validatePhonotactics('Asssir')).toBe(false);
    // Reject no vowels
    expect(generator.validatePhonotactics('Bcdfgh')).toBe(false);
    // Reject 3+ consecutive identical vowels
    expect(generator.validatePhonotactics('Baaar')).toBe(false);
    // Reject 5+ consecutive consonants
    expect(generator.validatePhonotactics('Bstrgklm')).toBe(false);
  });

  it('supports snake_case options (min_length and max_length)', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    const name = generator.generate({ min_length: 5, max_length: 10, temperature: 0.5 });
    expect(name.length).toBeGreaterThanOrEqual(5);
    expect(name.length).toBeLessThanOrEqual(10);
    expect(name[0]).toBe(name[0].toUpperCase());
  });

  it('throws error when generating without training data', () => {
    const generator = new MarkovNameGenerator([]);
    expect(() => generator.generate()).toThrow();
  });

  it('clears transitions and seeds on clear()', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    expect(generator.transitions.size).toBeGreaterThan(0);
    generator.clear();
    expect(generator.transitions.size).toBe(0);
    expect(() => generator.generate()).toThrow('Markov chain model has not been trained with any seeds');
  });

  it('throws error when impossible constraints cannot be satisfied', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    expect(() => generator.generate({ minLength: 50, maxLength: 60, maxAttempts: 5 })).toThrow(
      'Failed to generate a valid name within constraints'
    );
  });

  it('handles extreme temperature boundaries (very low and very high)', () => {
    const generator = new MarkovNameGenerator(seeds, { order: 2 });
    const lowTempName = generator.generate({ temperature: 0.01 });
    expect(typeof lowTempName).toBe('string');
    expect(lowTempName.length).toBeGreaterThanOrEqual(4);

    const highTempName = generator.generate({ temperature: 2.0 });
    expect(typeof highTempName).toBe('string');
    expect(highTempName.length).toBeGreaterThanOrEqual(4);
  });
});
