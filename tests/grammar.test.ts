import { describe, it, expect } from 'vitest';
import { RecursiveGrammarEngine } from '../src/engines/grammar';
import { MarkovNameGenerator } from '../src/engines/markov';
import { cultures } from '../src/data/cultures';

describe('RecursiveGrammarEngine', () => {
  const markov = new MarkovNameGenerator(['Kaelen', 'Morwenna', 'Oakhaven', 'Silverwatch']);
  const engine = new RecursiveGrammarEngine({ markov });

  it('resolves bracket alternation choices', () => {
    const template = 'The [Iron|Silver|Silent] Blade';
    const result = engine.resolve(template);
    expect(['The Iron Blade', 'The Silver Blade', 'The Silent Blade']).toContain(result);
  });

  it('interpolates Markov tokens', () => {
    const template = 'Castle {Markov:Settlement}';
    const result = engine.resolve(template);
    expect(result.startsWith('Castle ')).toBe(true);
    expect(result.length).toBeGreaterThan(7);
  });

  it('resolves contextual parent inheritance', () => {
    const template = 'Lower {Parent.root} Ward';
    const result = engine.resolve(template, { parent: { root: 'Oakhaven', name: 'Metropolis of Oakhaven' } });
    expect(result).toBe('Lower Oakhaven Ward');
  });

  it('handles user custom prefix overrides', () => {
    const template = '{Title} {Markov:Person}';
    const result = engine.resolve(template, { customVariables: { Title: 'Ser' } });
    expect(result.startsWith('Ser ')).toBe(true);
  });

  it('resolves nested templates recursively up to max depth', () => {
    const template = 'The [Order of {Markov:Settlement}|[Iron|Gilded] Watch of {Parent.root}]';
    const result = engine.resolve(template, { parent: { root: 'Valdoria' } });
    expect(result.length).toBeGreaterThan(5);
  });

  it('interpolates culture lexicon tokens and nested paths', () => {
    const celtic = cultures.celtic_gaelic;
    const celticEngine = new RecursiveGrammarEngine({ culture: celtic, markov });

    const template = '{given_names_masculine} of {orogeny.stems}';
    const result = celticEngine.resolve(template);
    const parts = result.split(' of ');
    expect(parts.length).toBe(2);
    expect(celtic.seeds.given_names_masculine).toContain(parts[0]);
    expect(celtic.geographic_lexicon.orogeny.stems).toContain(parts[1]);
  });

  it('handles shorthand lexicon tokens like {given}, {surname}, {settlement}', () => {
    const slavic = cultures.danubian_slavic;
    const slavicEngine = new RecursiveGrammarEngine({ culture: slavic });

    const template = '{given} {surname} of {settlement}';
    const result = slavicEngine.resolve(template, { gender: 'masculine' });
    const parts = result.split(' ');
    expect(parts.length).toBe(4);
    expect(slavic.seeds.given_names_masculine).toContain(parts[0]);
    expect(slavic.seeds.surnames).toContain(parts[1]);
    expect(parts[2]).toBe('of');
    expect(slavic.seeds.settlement_roots).toContain(parts[3]);
  });

  it('prevents infinite recursion loops when cyclic templates are provided', () => {
    const cyclicEngine = new RecursiveGrammarEngine({
      maxDepth: 5,
    });
    // A cyclic variable expansion: A -> B -> A
    const result = cyclicEngine.resolve('{LoopA}', {
      customVariables: {
        LoopA: '{LoopB}',
        LoopB: '{LoopA}',
      },
    });
    // Should terminate gracefully within maxDepth iterations without throwing Maximum call stack exceeded
    expect(typeof result).toBe('string');
  });

  it('cleans up whitespace, double spaces and trims output', () => {
    const template = '   The   [Iron|Iron]    Citadel   ';
    const result = engine.resolve(template);
    expect(result).toBe('The Iron Citadel');
  });

  it('resolves Markov tokens per culture without cross-cultural cache contamination', () => {
    const multiCultureEngine = new RecursiveGrammarEngine();
    const gaelicResult = multiCultureEngine.resolve('{Markov:Settlement}', {
      culture: cultures.celtic_gaelic,
    });
    const slavicResult = multiCultureEngine.resolve('{Markov:Settlement}', {
      culture: cultures.danubian_slavic,
    });
    expect(gaelicResult.length).toBeGreaterThan(3);
    expect(slavicResult.length).toBeGreaterThan(3);

    // Verify cache stores separate Markov models keyed by culture ID and category
    const cache = (multiCultureEngine as unknown as { cultureMarkovCache: Map<string, unknown> }).cultureMarkovCache;
    expect(cache.has('celtic_gaelic:settlement')).toBe(true);
    expect(cache.has('danubian_slavic:settlement')).toBe(true);
  });
});
