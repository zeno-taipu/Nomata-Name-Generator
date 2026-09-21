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

  it('throws error when generating without training data', () => {
    const generator = new MarkovNameGenerator([]);
    expect(() => generator.generate()).toThrow();
  });
});
