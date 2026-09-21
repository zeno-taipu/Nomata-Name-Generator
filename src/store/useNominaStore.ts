import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  EntityCategory,
  GeographicFeatureType,
  LoreEntity,
  NominaProjectBible,
  CustomSeedOverrides,
  CultureProfile,
} from '../types/domain';
import { normalizeEntityCategory } from '../types/domain';
import { cultures, getCultureById } from '../data/cultures';
import { MarkovNameGenerator, type WeightedSeeds } from '../engines/markov';
import { RecursiveGrammarEngine } from '../engines/grammar';
import { AnglicizationEngine } from '../engines/anglicize';
import { LineageBranchingEngine } from '../engines/branching';

export interface CustomVocabularyState {
  honorifics?: string[];
  customSeeds?: CustomSeedOverrides;
  customPrefixes?: string[];
  customSuffixes?: string[];
}

export interface EngineConfig {
  temperature?: number;
  markovOrder?: number;
  targetSubtype?: string;
}

export interface AnglicizationConfig {
  anglicize?: boolean;
  anglicizeMode?: 'phonetic' | 'suffix' | 'full';
  exonymDualDisplay?: boolean;
}

export interface NominaState {
  // State
  activeCategory: EntityCategory;
  activeCultureIds: string[];
  cultureWeights: Record<string, number>;
  targetSubtype: string;
  batchCount: number;
  temperature: number;
  markovOrder: number;
  anglicize: boolean;
  anglicizeMode: 'phonetic' | 'suffix' | 'full';
  exonymDualDisplay: boolean;
  customVocabulary: CustomVocabularyState;
  generatedBatch: LoreEntity[];
  activeEntityId: string | null;
  pinnedEntities: LoreEntity[];
  isGenerating: boolean;

  // Actions
  setActiveCategory: (cat: EntityCategory) => void;
  setActiveCultureIds: (ids: string[], weights?: Record<string, number>) => void;
  setBatchCount: (count: number) => void;
  setEngineConfig: (config: EngineConfig) => void;
  setAnglicizationConfig: (config: AnglicizationConfig) => void;
  setCustomVocabulary: (vocab: Partial<CustomVocabularyState>) => void;
  setActiveEntityId: (id: string | null) => void;
  generateBatch: () => LoreEntity[];
  branchEntity: (parentId: string, childSubtype?: string, count?: number) => LoreEntity[];
  reRollEntity: (entityId: string) => LoreEntity | undefined;
  toggleAnglicizeEntity: (entityId: string) => LoreEntity | undefined;
  togglePinEntity: (entity: LoreEntity) => void;
  saveProjectBible: (name?: string) => NominaProjectBible;
  loadProjectBible: (bible: NominaProjectBible) => void;
  clearBatch: () => void;
  clearPinned: () => void;
}

const FACTION_TEMPLATES = [
  'The Order of {root}',
  'The {root} Covenant',
  'Brotherhood of {root}',
  'The {root} Guild',
  'The {root} League',
  'The {root} Syndicate',
  'The Iron {root}',
  'Circle of {root}',
  'The {root} Enclave',
  'Legion of {root}',
];

const ARTIFACT_TEMPLATES = [
  'The {root} Blade',
  'The Crown of {root}',
  'Staff of {root}',
  'The {root} Grimoire',
  'Aegis of {root}',
  'The {root} Scepter',
  'Tome of {root}',
  'The Relic of {root}',
  'The Eye of {root}',
  'Heart of {root}',
];

function cloneEntityTree(entity: LoreEntity): LoreEntity {
  return {
    ...entity,
    children: entity.children ? entity.children.map(cloneEntityTree) : [],
  };
}

function findEntityInTree(entities: LoreEntity[], id: string): LoreEntity | undefined {
  for (const entity of entities) {
    if (entity.id === id) return entity;
    if (entity.children && entity.children.length > 0) {
      const found = findEntityInTree(entity.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function updateEntityInTree(
  entities: LoreEntity[],
  id: string,
  updater: (entity: LoreEntity) => LoreEntity
): { updated: boolean; list: LoreEntity[]; found?: LoreEntity } {
  let updated = false;
  let found: LoreEntity | undefined;

  const nextList = entities.map((entity) => {
    if (entity.id === id) {
      updated = true;
      const res = updater(entity);
      found = res;
      return res;
    }
    if (entity.children && entity.children.length > 0) {
      const childRes = updateEntityInTree(entity.children, id, updater);
      if (childRes.updated) {
        updated = true;
        found = childRes.found;
        return {
          ...entity,
          children: childRes.list,
        };
      }
    }
    return entity;
  });

  return { updated, list: nextList, found };
}

function setPinnedFlagInTree(entities: LoreEntity[], id: string, pinned: boolean): LoreEntity[] {
  return entities.map((entity) => {
    const isTarget = entity.id === id;
    const updatedChildren =
      entity.children && entity.children.length > 0
        ? setPinnedFlagInTree(entity.children, id, pinned)
        : entity.children;

    return {
      ...entity,
      pinned: isTarget ? pinned : entity.pinned,
      children: updatedChildren,
    };
  });
}

function unpinAllInTree(entities: LoreEntity[]): LoreEntity[] {
  return entities.map((entity) => ({
    ...entity,
    pinned: false,
    children: entity.children ? unpinAllInTree(entity.children) : [],
  }));
}

// In-memory storage fallback for Node / SSR test runners or localStorage-restricted environments
const memoryStorage = new Map<string, string>();
const safeStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, val: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, val);
        return;
      } catch {
        memoryStorage.set(key, val);
        return;
      }
    }
    memoryStorage.set(key, val);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        memoryStorage.delete(key);
        return;
      }
    }
    memoryStorage.delete(key);
  },
};

export const useNominaStore = create<NominaState>()(
  persist(
    (set, get) => ({
      // Default state
      activeCategory: 'character',
      activeCultureIds: ['danubian_slavic'],
      cultureWeights: {},
      targetSubtype: 'auto',
      batchCount: 10,
      temperature: 0.7,
      markovOrder: 2,
      anglicize: false,
      anglicizeMode: 'phonetic',
      exonymDualDisplay: false,
      customVocabulary: {
        honorifics: [],
        customPrefixes: [],
        customSuffixes: [],
      },
      generatedBatch: [],
      activeEntityId: null,
      pinnedEntities: [],
      isGenerating: false,

      // Actions
      setActiveCategory: (cat) => set({ activeCategory: cat }),

      setActiveCultureIds: (ids, weights = {}) =>
        set({ activeCultureIds: ids, cultureWeights: weights }),

      setBatchCount: (count) => set({ batchCount: Math.max(1, count) }),

      setEngineConfig: (config) =>
        set((state) => ({
          temperature: config.temperature !== undefined ? config.temperature : state.temperature,
          markovOrder: config.markovOrder !== undefined ? config.markovOrder : state.markovOrder,
          targetSubtype: config.targetSubtype !== undefined ? config.targetSubtype : state.targetSubtype,
        })),

      setAnglicizationConfig: (config) =>
        set((state) => ({
          anglicize: config.anglicize !== undefined ? config.anglicize : state.anglicize,
          anglicizeMode: config.anglicizeMode !== undefined ? config.anglicizeMode : state.anglicizeMode,
          exonymDualDisplay:
            config.exonymDualDisplay !== undefined ? config.exonymDualDisplay : state.exonymDualDisplay,
        })),

      setCustomVocabulary: (vocab) =>
        set((state) => ({
          customVocabulary: {
            ...state.customVocabulary,
            ...vocab,
          },
        })),

      setActiveEntityId: (id) => set({ activeEntityId: id }),

      generateBatch: () => {
        const state = get();
        set({ isGenerating: true });

        const normalizedCat = normalizeEntityCategory(state.activeCategory);
        const activeCultureIds =
          state.activeCultureIds && state.activeCultureIds.length > 0
            ? state.activeCultureIds
            : ['danubian_slavic'];

        const cultureProfiles = state.activeCultureIds
          .map((id) => getCultureById(id))
          .filter((c): c is CultureProfile => c !== undefined);

        const safeProfiles = cultureProfiles.length > 0 ? cultureProfiles : [cultures['danubian_slavic']];
        const primaryCulture = safeProfiles[0];

        // Gather seed dictionaries with weights
        const weightedSeeds: WeightedSeeds[] = [];
        for (const cp of safeProfiles) {
          const weight = state.cultureWeights[cp.id] ?? 1.0;
          let seeds: string[] = [];

          if (normalizedCat === 'character') {
            seeds = [
              ...(cp.seeds?.given_names_masculine || []),
              ...(cp.seeds?.given_names_feminine || []),
              ...(cp.seeds?.surnames || []),
            ];
          } else if (normalizedCat === 'settlement') {
            seeds = [...(cp.seeds?.settlement_roots || [])];
          } else if (normalizedCat === 'geography') {
            seeds = [
              ...(cp.geographic_lexicon?.orogeny?.stems || []),
              ...(cp.geographic_lexicon?.hydrology?.stems || []),
              ...(cp.geographic_lexicon?.wilds?.stems || []),
            ];
          } else {
            seeds = [
              ...(cp.seeds?.settlement_roots || []),
              ...(cp.geographic_lexicon?.orogeny?.stems || []),
            ];
          }
          weightedSeeds.push({ seeds, weight });
        }

        if (state.customVocabulary?.customSeeds) {
          const cs = state.customVocabulary.customSeeds;
          const customList = [
            ...(cs.given_names_masculine || []),
            ...(cs.given_names_feminine || []),
            ...(cs.surnames || []),
            ...(cs.settlement_roots || []),
            ...(cs.orogeny_stems || []),
            ...(cs.hydrology_stems || []),
            ...(cs.wilds_stems || []),
          ];
          if (customList.length > 0) {
            weightedSeeds.push({ seeds: customList, weight: 2.0 });
          }
        }

        const markov = new MarkovNameGenerator(undefined, { order: state.markovOrder });
        markov.trainWithWeights(weightedSeeds);

        const grammarEngine = new RecursiveGrammarEngine({
          markov,
          culture: primaryCulture,
        });
        const anglicizationEngine = new AnglicizationEngine();

        // Custom variables injection
        const customVariables: Record<string, string | number | string[]> = {};
        if (state.customVocabulary?.honorifics && state.customVocabulary.honorifics.length > 0) {
          customVariables['title'] = state.customVocabulary.honorifics;
          customVariables['honorific_titles'] = state.customVocabulary.honorifics;
        }
        if (state.customVocabulary?.customPrefixes && state.customVocabulary.customPrefixes.length > 0) {
          customVariables['prefix'] = state.customVocabulary.customPrefixes;
          customVariables['prefixes'] = state.customVocabulary.customPrefixes;
        }
        if (state.customVocabulary?.customSuffixes && state.customVocabulary.customSuffixes.length > 0) {
          customVariables['suffix'] = state.customVocabulary.customSuffixes;
          customVariables['suffixes'] = state.customVocabulary.customSuffixes;
        }

        const newBatch: LoreEntity[] = [];

        for (let i = 0; i < state.batchCount; i++) {
          let template = '{root}';
          let featureSubtype: GeographicFeatureType | undefined;
          let subtype = state.targetSubtype && state.targetSubtype !== 'auto' ? state.targetSubtype : undefined;

          if (normalizedCat === 'character') {
            const templates = primaryCulture.grammar_templates?.character_full_name || ['{given} {surname}'];
            template = templates[i % templates.length];
            if (!subtype) {
              const subtypes = ['Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan'];
              subtype = subtypes[i % subtypes.length];
            }
          } else if (normalizedCat === 'settlement') {
            const templates = primaryCulture.grammar_templates?.settlement_name || ['{root}'];
            template = templates[i % templates.length];
            if (!subtype) {
              const subtypes = ['Metropolis', 'Fortress', 'Town', 'Haven', 'Village'];
              subtype = subtypes[i % subtypes.length];
            }
          } else if (normalizedCat === 'geography') {
            const geoTypes: GeographicFeatureType[] = ['orogeny', 'hydrology', 'wilds'];
            const chosen = geoTypes[i % geoTypes.length];
            featureSubtype = chosen;
            const geoTemplates = primaryCulture.grammar_templates?.[`${chosen}_name`] || ['{stem}'];
            template = geoTemplates[i % geoTemplates.length];
            if (!subtype) {
              subtype = chosen === 'orogeny' ? 'Mountain Range' : chosen === 'hydrology' ? 'River Basin' : 'Primeval Woods';
            }
          } else if (normalizedCat === 'faction') {
            template = FACTION_TEMPLATES[i % FACTION_TEMPLATES.length];
            if (!subtype) subtype = 'Order';
          } else if (normalizedCat === 'artifact') {
            template = ARTIFACT_TEMPLATES[i % ARTIFACT_TEMPLATES.length];
            if (!subtype) subtype = 'Relic';
          }

          let resolvedName = grammarEngine.resolve(template, {
            culture: primaryCulture,
            markov,
            customVariables,
            featureSubtype,
          });

          if (!resolvedName || resolvedName.includes('{')) {
            resolvedName = markov.generate({ temperature: state.temperature });
          }

          const rootGuess = resolvedName.split(/\s+/)[0] || resolvedName;
          const entityId = `entity-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
          const isPinned = state.pinnedEntities.some((p) => p.name === resolvedName);

          let entity: LoreEntity = {
            id: entityId,
            name: resolvedName,
            originalName: resolvedName,
            originalRoot: rootGuess,
            rootName: rootGuess,
            category: normalizedCat,
            cultureId: primaryCulture.id,
            cultureIds: activeCultureIds.length > 1 ? [...activeCultureIds] : undefined,
            subtype,
            featureSubtype,
            children: [],
            pinned: isPinned,
            createdAt: Date.now(),
          };

          if (state.anglicize) {
            entity = anglicizationEngine.anglicizeEntity(entity, {
              mode: state.anglicizeMode,
              exonymDualDisplay: state.exonymDualDisplay,
            });
          }

          newBatch.push(entity);
        }

        set({ generatedBatch: newBatch, isGenerating: false });
        return newBatch;
      },

      branchEntity: (parentId, childSubtype = 'auto', count = 1) => {
        const state = get();
        const parent =
          findEntityInTree(state.generatedBatch, parentId) ||
          findEntityInTree(state.pinnedEntities, parentId);

        if (!parent) return [];

        const branchingEngine = new LineageBranchingEngine({
          markovOrder: state.markovOrder,
          temperature: state.temperature,
        });

        // Use isolated clone of parent so branchChildren does not mutate live store objects in-place
        const detachedParent: LoreEntity = {
          ...parent,
          children: [...(parent.children || [])],
        };

        const newChildren = branchingEngine.branchChildren(detachedParent, childSubtype, count, {
          markovOrder: state.markovOrder,
          temperature: state.temperature,
          anglicize: state.anglicize,
          anglicizeMode: state.anglicizeMode,
        });

        const updater = (p: LoreEntity): LoreEntity => ({
          ...p,
          children: [...(p.children || []), ...newChildren],
        });

        const batchRes = updateEntityInTree(state.generatedBatch, parentId, updater);
        const pinnedRes = updateEntityInTree(state.pinnedEntities, parentId, updater);

        set({
          generatedBatch: batchRes.list,
          pinnedEntities: pinnedRes.list,
        });

        return newChildren;
      },

      reRollEntity: (entityId) => {
        const state = get();
        const target =
          findEntityInTree(state.generatedBatch, entityId) ||
          findEntityInTree(state.pinnedEntities, entityId);

        if (!target) return undefined;

        const anglicizationEngine = new AnglicizationEngine();

        // If entity has a parent, branch a replacement from parent
        if (target.parentId) {
          const parent =
            findEntityInTree(state.generatedBatch, target.parentId) ||
            findEntityInTree(state.pinnedEntities, target.parentId);

          if (parent) {
            const branchingEngine = new LineageBranchingEngine({
              markovOrder: state.markovOrder,
              temperature: state.temperature,
            });

            // Use detached clone of parent so branchChildren does not mutate parent.children in store
            const detachedParent: LoreEntity = {
              ...parent,
              children: [],
            };

            const [tempChild] = branchingEngine.branchChildren(detachedParent, target.subtype ?? 'auto', 1, {
              markovOrder: state.markovOrder,
              temperature: state.temperature,
              anglicize: target.anglicization?.enabled ?? state.anglicize,
              anglicizeMode: target.anglicization?.mode ?? state.anglicizeMode,
            });

            if (tempChild) {
              const updater = (ent: LoreEntity): LoreEntity => ({
                ...ent,
                name: tempChild.name,
                originalName: tempChild.originalName,
                originalRoot: tempChild.originalRoot,
                rootName: tempChild.rootName,
                epithet: tempChild.epithet,
                anglicization: tempChild.anglicization,
              });

              const updatedBatchRes = updateEntityInTree(state.generatedBatch, entityId, updater);
              const updatedPinnedRes = updateEntityInTree(state.pinnedEntities, entityId, updater);

              set({
                generatedBatch: updatedBatchRes.list,
                pinnedEntities: updatedPinnedRes.list,
              });

              return updatedBatchRes.found || updatedPinnedRes.found;
            }
          }
        }

        // Otherwise root entity re-roll
        const culture = getCultureById(target.cultureId) ?? cultures['danubian_slavic'];
        const markov = new MarkovNameGenerator(undefined, { order: state.markovOrder });
        const seeds = [
          ...(culture.seeds?.given_names_masculine || []),
          ...(culture.seeds?.given_names_feminine || []),
          ...(culture.seeds?.settlement_roots || []),
        ];
        markov.train(seeds.length > 0 ? seeds : ['Novigrad', 'Branimir']);

        const grammarEngine = new RecursiveGrammarEngine({ markov, culture });
        let template = '{root}';
        const normCat = normalizeEntityCategory(target.category);

        if (normCat === 'character' && culture.grammar_templates?.character_full_name?.length) {
          template = culture.grammar_templates.character_full_name[0];
        } else if (normCat === 'settlement' && culture.grammar_templates?.settlement_name?.length) {
          template = culture.grammar_templates.settlement_name[0];
        } else if (normCat === 'geography' && target.featureSubtype) {
          template = culture.grammar_templates?.[`${target.featureSubtype}_name`]?.[0] ?? '{stem}';
        } else if (normCat === 'faction') {
          template = FACTION_TEMPLATES[Math.floor(Math.random() * FACTION_TEMPLATES.length)];
        } else if (normCat === 'artifact') {
          template = ARTIFACT_TEMPLATES[Math.floor(Math.random() * ARTIFACT_TEMPLATES.length)];
        }

        let newName = grammarEngine.resolve(template, { culture, markov });
        if (!newName || newName.includes('{')) {
          newName = markov.generate({ temperature: state.temperature });
        }

        const newRoot = newName.split(/\s+/)[0] || newName;

        let updatedEntity: LoreEntity = {
          ...target,
          name: newName,
          originalName: newName,
          originalRoot: newRoot,
          rootName: newRoot,
        };

        if (target.anglicization?.enabled) {
          updatedEntity = anglicizationEngine.anglicizeEntity(updatedEntity, {
            mode: target.anglicization.mode,
            exonymDualDisplay: target.anglicization.exonymDualDisplay,
          });
        }

        const updater = () => updatedEntity;
        const batchRes = updateEntityInTree(state.generatedBatch, entityId, updater);
        const pinnedRes = updateEntityInTree(state.pinnedEntities, entityId, updater);

        set({
          generatedBatch: batchRes.list,
          pinnedEntities: pinnedRes.list,
        });

        return updatedEntity;
      },

      toggleAnglicizeEntity: (entityId) => {
        const state = get();
        const target =
          findEntityInTree(state.generatedBatch, entityId) ||
          findEntityInTree(state.pinnedEntities, entityId);

        if (!target) return undefined;

        const engine = new AnglicizationEngine();
        let toggled: LoreEntity;

        if (target.anglicization?.enabled) {
          toggled = engine.revert(target);
        } else {
          toggled = engine.anglicizeEntity(target, {
            mode: state.anglicizeMode,
            exonymDualDisplay: state.exonymDualDisplay,
          });
        }

        const updater = () => toggled;
        const batchRes = updateEntityInTree(state.generatedBatch, entityId, updater);
        const pinnedRes = updateEntityInTree(state.pinnedEntities, entityId, updater);

        set({
          generatedBatch: batchRes.list,
          pinnedEntities: pinnedRes.list,
        });

        return toggled;
      },

      togglePinEntity: (entity) => {
        const state = get();
        const isAlreadyPinned = state.pinnedEntities.some((p) => p.id === entity.id);

        if (isAlreadyPinned) {
          // Remove from pinned
          const updatedPinned = state.pinnedEntities.filter((p) => p.id !== entity.id);
          const updatedBatch = setPinnedFlagInTree(state.generatedBatch, entity.id, false);
          set({ pinnedEntities: updatedPinned, generatedBatch: updatedBatch });
        } else {
          // Add to pinned
          const pinnedClone: LoreEntity = { ...cloneEntityTree(entity), pinned: true };
          const updatedPinned = [...state.pinnedEntities, pinnedClone];
          const updatedBatch = setPinnedFlagInTree(state.generatedBatch, entity.id, true);
          set({ pinnedEntities: updatedPinned, generatedBatch: updatedBatch });
        }
      },

      saveProjectBible: (name = 'Nomina World Bible') => {
        const state = get();

        // Deduplicate entities between pinned and generated batch
        const pinnedIds = new Set(state.pinnedEntities.map((p) => p.id));
        const combinedEntities: LoreEntity[] = [
          ...state.pinnedEntities,
          ...state.generatedBatch.filter((b) => !pinnedIds.has(b.id)),
        ];

        return {
          version: '1.0.0',
          name,
          entities: combinedEntities,
          pinnedEntityIds: state.pinnedEntities.map((p) => p.id),
          customVocabulary: {
            honorifics: state.customVocabulary.honorifics ?? [],
            customSeeds: state.customVocabulary.customSeeds,
            customPrefixes: state.customVocabulary.customPrefixes ?? [],
            customSuffixes: state.customVocabulary.customSuffixes ?? [],
          },
          settings: {
            activeCultureIds: state.activeCultureIds,
            cultureWeights: state.cultureWeights,
            anglicize: state.anglicize,
            anglicizeMode: state.anglicizeMode,
            exonymDualDisplay: state.exonymDualDisplay,
            temperature: state.temperature,
            markovOrder: state.markovOrder,
          },
          savedAt: Date.now(),
        };
      },

      loadProjectBible: (bible) => {
        const pinnedIds = new Set(bible.pinnedEntityIds || []);
        const pinned = (bible.entities || [])
          .filter((e) => pinnedIds.has(e.id))
          .map((e) => ({ ...e, pinned: true }));
        const batch = (bible.entities || []).filter((e) => !pinnedIds.has(e.id));

        set({
          activeCultureIds:
            bible.settings.activeCultureIds?.length > 0
              ? bible.settings.activeCultureIds
              : ['danubian_slavic'],
          cultureWeights: bible.settings.cultureWeights ?? {},
          anglicize: Boolean(bible.settings.anglicize),
          anglicizeMode: bible.settings.anglicizeMode ?? 'phonetic',
          exonymDualDisplay: Boolean(bible.settings.exonymDualDisplay),
          temperature: bible.settings.temperature ?? 0.7,
          markovOrder: bible.settings.markovOrder ?? 2,
          customVocabulary: {
            honorifics: bible.customVocabulary?.honorifics ?? [],
            customSeeds: bible.customVocabulary?.customSeeds,
            customPrefixes: bible.customVocabulary?.customPrefixes ?? [],
            customSuffixes: bible.customVocabulary?.customSuffixes ?? [],
          },
          pinnedEntities: pinned,
          generatedBatch: batch,
          activeEntityId: null,
        });
      },

      clearBatch: () => set({ generatedBatch: [], activeEntityId: null }),

      clearPinned: () =>
        set((state) => ({
          pinnedEntities: [],
          generatedBatch: unpinAllInTree(state.generatedBatch),
        })),
    }),
    {
      name: 'nomina-world-bible-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        activeCategory: state.activeCategory,
        activeCultureIds: state.activeCultureIds,
        cultureWeights: state.cultureWeights,
        targetSubtype: state.targetSubtype,
        batchCount: state.batchCount,
        temperature: state.temperature,
        markovOrder: state.markovOrder,
        anglicize: state.anglicize,
        anglicizeMode: state.anglicizeMode,
        exonymDualDisplay: state.exonymDualDisplay,
        customVocabulary: state.customVocabulary,
        pinnedEntities: state.pinnedEntities,
        generatedBatch: state.generatedBatch,
      }),
    }
  )
);
