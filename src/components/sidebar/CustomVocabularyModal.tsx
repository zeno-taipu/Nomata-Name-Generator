import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { useNominaStore } from '../../store/useNominaStore';
import { cn } from '../../utils/cn';

export interface CustomVocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const PRESET_HONORIFICS = ['Ser', 'Lady', 'Archon', 'Vojvoda', 'Jarl', 'Boyar', 'High Magister'];
const PRESET_PREFIXES = ["O'", 'Mac', 'Von', 'Al-', 'De', 'Fitz', 'Ben'];
const PRESET_SUFFIXES = ['-ford', '-grad', '-by', '-stead', '-gard', '-vale', '-wick'];
const PRESET_SEEDS = ['Valer', 'Ael', 'Drak', 'Khor', 'Vane', 'Thal', 'Mor', 'Sol'];
const PRESET_EPITHETS = [
  'the Brave',
  'the Undaunted',
  'the Bloodhound',
  'the Iron Hand',
  'the Silent',
  'the Swift',
  'the Wise',
  'the Shadow',
];

export const CustomVocabularyModal: React.FC<CustomVocabularyModalProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const customVocabulary = useNominaStore((state) => state.customVocabulary);
  const setCustomVocabulary = useNominaStore((state) => state.setCustomVocabulary);

  // Local input states
  const [honorificInput, setHonorificInput] = useState('');
  const [prefixInput, setPrefixInput] = useState('');
  const [suffixInput, setSuffixInput] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [epithetInput, setEpithetInput] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentHonorifics = customVocabulary.honorifics ?? [];
  const currentPrefixes = customVocabulary.customPrefixes ?? [];
  const currentSuffixes = customVocabulary.customSuffixes ?? [];
  const currentSeeds = customVocabulary.customSeeds?.settlement_roots ?? [];
  const currentEpithets = customVocabulary.customSeeds?.epithets ?? [];

  const totalCustomCount =
    currentHonorifics.length +
    currentPrefixes.length +
    currentSuffixes.length +
    currentSeeds.length +
    currentEpithets.length;

  // Tag manipulation helpers
  const addTag = (
    value: string,
    list: string[],
    updateFn: (newList: string[]) => void,
    clearInputFn: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Support comma-separated batch input
    const parts = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !list.includes(p));

    if (parts.length > 0) {
      updateFn([...list, ...parts]);
    }
    clearInputFn();
  };

  const removeTag = (
    itemToRemove: string,
    list: string[],
    updateFn: (newList: string[]) => void
  ) => {
    updateFn(list.filter((item) => item !== itemToRemove));
  };

  const updateHonorifics = (newList: string[]) => {
    setCustomVocabulary({ honorifics: newList });
  };

  const updatePrefixes = (newList: string[]) => {
    setCustomVocabulary({ customPrefixes: newList });
  };

  const updateSuffixes = (newList: string[]) => {
    setCustomVocabulary({ customSuffixes: newList });
  };

  const updateSeeds = (newList: string[]) => {
    setCustomVocabulary({
      customSeeds: {
        ...(customVocabulary.customSeeds || {}),
        settlement_roots: newList,
        given_names_masculine: newList,
        given_names_feminine: newList,
        surnames: newList,
        orogeny_stems: newList,
        hydrology_stems: newList,
        wilds_stems: newList,
      },
    });
  };

  const updateEpithets = (newList: string[]) => {
    setCustomVocabulary({
      customSeeds: {
        ...(customVocabulary.customSeeds || {}),
        epithets: newList,
      },
    });
  };

  const handleClearAll = () => {
    setCustomVocabulary({
      honorifics: [],
      customPrefixes: [],
      customSuffixes: [],
      customSeeds: {
        settlement_roots: [],
        given_names_masculine: [],
        given_names_feminine: [],
        surnames: [],
        orogeny_stems: [],
        hydrology_stems: [],
        wilds_stems: [],
        epithets: [],
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-vocab-title"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-charcoal-900 border border-charcoal-700/90 rounded-2xl shadow-2xl overflow-hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-750 bg-charcoal-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-vocab-title"
                className="text-base font-semibold text-slate-100 flex items-center gap-2"
              >
                Custom Vocabulary & Seed Lexicon
                {totalCustomCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
                    {totalCustomCount} active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Override titles, affixes, and inject custom seed roots into generation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-charcoal-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Custom Honorifics */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-honorific"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <span>Custom Honorific Titles</span>
                <span className="text-slate-400 font-normal">({currentHonorifics.length})</span>
              </label>
              <span className="text-[11px] text-slate-400">e.g., Ser, Lady, Archon, Vojvoda</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-honorific"
                type="text"
                value={honorificInput}
                onChange={(e) => setHonorificInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(honorificInput, currentHonorifics, updateHonorifics, () =>
                      setHonorificInput('')
                    );
                  }
                }}
                placeholder="Enter title (e.g. Vojvoda or Ser, Lady) & press Enter"
                className="flex-1 px-3 py-2 text-xs bg-charcoal-800 border border-charcoal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
              />
              <button
                type="button"
                onClick={() =>
                  addTag(honorificInput, currentHonorifics, updateHonorifics, () =>
                    setHonorificInput('')
                  )
                }
                className="px-3 py-2 text-xs font-medium rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30 hover:bg-gold-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-400">Quick Presets:</span>
              {PRESET_HONORIFICS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentHonorifics.includes(preset)) {
                      updateHonorifics([...currentHonorifics, preset]);
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    currentHonorifics.includes(preset)
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400 cursor-default'
                      : 'bg-charcoal-800 border-charcoal-700 hover:border-slate-500 text-slate-300'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            {currentHonorifics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-charcoal-850/60 rounded-lg border border-charcoal-750">
                {currentHonorifics.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gold-500/10 text-gold-300 border border-gold-500/30"
                  >
                    <span>{h}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(h, currentHonorifics, updateHonorifics)}
                      aria-label={`Remove ${h}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Custom Prefixes */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-prefix"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <span>Custom Prefixes</span>
                <span className="text-slate-400 font-normal">({currentPrefixes.length})</span>
              </label>
              <span className="text-[11px] text-slate-400">e.g., O', Mac, Von, Al-</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-prefix"
                type="text"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(prefixInput, currentPrefixes, updatePrefixes, () =>
                      setPrefixInput('')
                    );
                  }
                }}
                placeholder="Enter prefix (e.g. Von, Al-) & press Enter"
                className="flex-1 px-3 py-2 text-xs bg-charcoal-800 border border-charcoal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
              />
              <button
                type="button"
                onClick={() =>
                  addTag(prefixInput, currentPrefixes, updatePrefixes, () =>
                    setPrefixInput('')
                  )
                }
                className="px-3 py-2 text-xs font-medium rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30 hover:bg-gold-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-400">Quick Presets:</span>
              {PRESET_PREFIXES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentPrefixes.includes(preset)) {
                      updatePrefixes([...currentPrefixes, preset]);
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    currentPrefixes.includes(preset)
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400 cursor-default'
                      : 'bg-charcoal-800 border-charcoal-700 hover:border-slate-500 text-slate-300'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            {currentPrefixes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-charcoal-850/60 rounded-lg border border-charcoal-750">
                {currentPrefixes.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gold-500/10 text-gold-300 border border-gold-500/30"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(p, currentPrefixes, updatePrefixes)}
                      aria-label={`Remove ${p}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Custom Suffixes */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-suffix"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <span>Custom Suffixes</span>
                <span className="text-slate-400 font-normal">({currentSuffixes.length})</span>
              </label>
              <span className="text-[11px] text-slate-400">e.g., -ford, -grad, -by, -stead</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-suffix"
                type="text"
                value={suffixInput}
                onChange={(e) => setSuffixInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(suffixInput, currentSuffixes, updateSuffixes, () =>
                      setSuffixInput('')
                    );
                  }
                }}
                placeholder="Enter suffix (e.g. -ford, -grad) & press Enter"
                className="flex-1 px-3 py-2 text-xs bg-charcoal-800 border border-charcoal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
              />
              <button
                type="button"
                onClick={() =>
                  addTag(suffixInput, currentSuffixes, updateSuffixes, () =>
                    setSuffixInput('')
                  )
                }
                className="px-3 py-2 text-xs font-medium rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30 hover:bg-gold-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-400">Quick Presets:</span>
              {PRESET_SUFFIXES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentSuffixes.includes(preset)) {
                      updateSuffixes([...currentSuffixes, preset]);
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    currentSuffixes.includes(preset)
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400 cursor-default'
                      : 'bg-charcoal-800 border-charcoal-700 hover:border-slate-500 text-slate-300'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            {currentSuffixes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-charcoal-850/60 rounded-lg border border-charcoal-750">
                {currentSuffixes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gold-500/10 text-gold-300 border border-gold-500/30"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(s, currentSuffixes, updateSuffixes)}
                      aria-label={`Remove ${s}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Custom Seed Roots */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-seed"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <span>Custom Seed Roots</span>
                <span className="text-slate-400 font-normal">({currentSeeds.length})</span>
              </label>
              <span className="text-[11px] text-slate-400">Direct Markov training seeds (2.0x weight)</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-seed"
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(seedInput, currentSeeds, updateSeeds, () => setSeedInput(''));
                  }
                }}
                placeholder="Enter seed roots (e.g. Valer, Drak, Khor) & press Enter"
                className="flex-1 px-3 py-2 text-xs bg-charcoal-800 border border-charcoal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
              />
              <button
                type="button"
                onClick={() =>
                  addTag(seedInput, currentSeeds, updateSeeds, () => setSeedInput(''))
                }
                className="px-3 py-2 text-xs font-medium rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30 hover:bg-gold-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-400">Quick Roots:</span>
              {PRESET_SEEDS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentSeeds.includes(preset)) {
                      updateSeeds([...currentSeeds, preset]);
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    currentSeeds.includes(preset)
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400 cursor-default'
                      : 'bg-charcoal-800 border-charcoal-700 hover:border-slate-500 text-slate-300'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            {currentSeeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-charcoal-850/60 rounded-lg border border-charcoal-750 max-h-32 overflow-y-auto">
                {currentSeeds.map((seed) => (
                  <span
                    key={seed}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gold-500/10 text-gold-300 border border-gold-500/30"
                  >
                    <span>{seed}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(seed, currentSeeds, updateSeeds)}
                      aria-label={`Remove ${seed}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Section 5: Custom Epithets */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-epithet"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <span>Custom Epithets & Cognomens</span>
                <span className="text-slate-400 font-normal">({currentEpithets.length})</span>
              </label>
              <span className="text-[11px] text-slate-400">e.g., the Brave, the Undaunted, the Iron Hand</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-epithet"
                type="text"
                value={epithetInput}
                onChange={(e) => setEpithetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(epithetInput, currentEpithets, updateEpithets, () => setEpithetInput(''));
                  }
                }}
                placeholder="Enter epithet (e.g. the Brave, the Iron Hand) & press Enter"
                className="flex-1 px-3 py-2 text-xs bg-charcoal-800 border border-charcoal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30"
              />
              <button
                type="button"
                onClick={() =>
                  addTag(epithetInput, currentEpithets, updateEpithets, () => setEpithetInput(''))
                }
                className="px-3 py-2 text-xs font-medium rounded-lg bg-gold-500/20 text-gold-300 border border-gold-500/30 hover:bg-gold-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-400">Quick Epithets:</span>
              {PRESET_EPITHETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!currentEpithets.includes(preset)) {
                      updateEpithets([...currentEpithets, preset]);
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    currentEpithets.includes(preset)
                      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400 cursor-default'
                      : 'bg-charcoal-800 border-charcoal-700 hover:border-slate-500 text-slate-300'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Tag Pills */}
            {currentEpithets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-charcoal-850/60 rounded-lg border border-charcoal-750 max-h-32 overflow-y-auto">
                {currentEpithets.map((ep) => (
                  <span
                    key={ep}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gold-500/10 text-gold-300 border border-gold-500/30"
                  >
                    <span>{ep}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(ep, currentEpithets, updateEpithets)}
                      aria-label={`Remove ${ep}`}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-charcoal-750 bg-charcoal-950/60">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={totalCustomCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-gold-500 text-charcoal-950 font-semibold hover:bg-gold-400 active:bg-gold-600 shadow-md transition-colors"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomVocabularyModal;
