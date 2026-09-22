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
import { prepareCustomGenerationContext } from '../engines/vocabulary';
import {
  type ThemeSettings,
  DEFAULT_THEME_SETTINGS,
  THEME_PRESETS,
} from '../theme/themeConfig';
import { applyThemeToDOM } from '../utils/theme';
import { validateProjectBible } from '../utils/projectValidation';
import { getCategorySubtypes } from '../config/entitySubtypes';
import { createSafeStorage } from './safeStorage';
import { reportPersistenceError } from './persistenceStatus';

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
  themeSettings: ThemeSettings;

  // Actions
  setActiveCategory: (cat: EntityCategory) => void;
  setActiveCultureIds: (ids: string[], weights?: Record<string, number>) => void;
  setBatchCount: (count: number) => void;
  setEngineConfig: (config: EngineConfig) => void;
  setAnglicizationConfig: (config: AnglicizationConfig) => void;
  setCustomVocabulary: (vocab: Partial<CustomVocabularyState>) => void;
  setActiveEntityId: (id: string | null) => void;
  updateThemeSettings: (partial: Partial<ThemeSettings>) => void;
  resetThemeSettings: () => void;
  applyPresetTheme: (presetId: string) => void;
  generateBatch: () => LoreEntity[];
  branchEntity: (parentId: string, childSubtype?: string, count?: number) => LoreEntity[];
  setEntityBranchSubtype: (entityId: string, subtype: string) => void;
  reRollEntity: (entityId: string) => LoreEntity | undefined;
  toggleAnglicizeEntity: (entityId: string) => LoreEntity | undefined;
  globalAnglicize: (target?: 'all' | 'batch' | 'pinned', forceState?: boolean) => void;
  togglePinEntity: (entity: LoreEntity) => void;
  pinAllBatch: () => void;
  reRollBatch: () => LoreEntity[];
  deleteEntity: (entityId: string) => boolean;
  saveProjectBible: (name?: string) => NominaProjectBible;
  loadProjectBible: (bible: unknown) => void;
  clearBatch: () => void;
  clearPinned: () => void;
}



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

function removeEntityFromTree(
  entities: LoreEntity[],
  id: string
): { removed: boolean; list: LoreEntity[]; deleted?: LoreEntity } {
  let removed = false;
  let deleted: LoreEntity | undefined;

  const nextList: LoreEntity[] = [];
  for (const entity of entities) {
    if (entity.id === id) {
      removed = true;
      deleted = entity;
      continue; // Filter this entity out
    }
    if (entity.children && entity.children.length > 0) {
      const childRes = removeEntityFromTree(entity.children, id);
      if (childRes.removed) {
        removed = true;
        deleted = childRes.deleted;
        nextList.push({
          ...entity,
          children: childRes.list,
        });
        continue;
      }
    }
    nextList.push(entity);
  }

  return { removed, list: nextList, deleted };
}

function synchronizePins(entities: LoreEntity[], pinnedIds: ReadonlySet<string>): LoreEntity[] {
  return entities.map((entity) => {
    const updatedChildren =
      entity.children && entity.children.length > 0
        ? synchronizePins(entity.children, pinnedIds)
        : entity.children;

    return {
      ...entity,
      pinned: pinnedIds.has(entity.id),
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

const safeStorage = createSafeStorage();

/**
 * Prepares augmented culture and custom grammar variables so that all user-supplied
 * custom vocabulary, affixes, honorifics, epithets, and seed roots are actively applied
 * during generation, re-rolls, and lineage branching without regurgitating raw roots.
 */
function getAugmentedCultureAndVariables(
  primaryCulture: CultureProfile,
  customVocabulary: CustomVocabularyState | undefined,
  category: EntityCategory = 'character',
  options?: Parameters<typeof prepareCustomGenerationContext>[3]
) {
  const normCat = normalizeEntityCategory(category);
  const { augmentedCulture, customVariables, weightedSeeds, templates } = prepareCustomGenerationContext(
    primaryCulture,
    customVocabulary,
    normCat,
    options
  );

  return {
    augmentedCulture,
    customVariables,
    uniqueCustomRoots: weightedSeeds,
    templates,
  };
}

function getCultureSeeds(
  culture: CultureProfile,
  category: EntityCategory,
  featureSubtype?: GeographicFeatureType
): string[] {
  switch (normalizeEntityCategory(category)) {
    case 'character':
      return [
        ...culture.seeds.given_names_masculine,
        ...culture.seeds.given_names_feminine,
        ...culture.seeds.surnames,
      ];
    case 'settlement':
      return culture.seeds.settlement_roots;
    case 'geography':
      return featureSubtype
        ? culture.geographic_lexicon[featureSubtype].stems
        : Object.values(culture.geographic_lexicon).flatMap((lexicon) => lexicon.stems);
    default:
      return [...culture.seeds.settlement_roots, ...culture.geographic_lexicon.orogeny.stems];
  }
}

const useRawNominaStore = create<NominaState>()(
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
      themeSettings: DEFAULT_THEME_SETTINGS,

      // Actions
      setActiveCategory: (cat) =>
        set((state) => ({
          activeCategory: cat,
          targetSubtype:
            normalizeEntityCategory(cat) === normalizeEntityCategory(state.activeCategory)
              ? state.targetSubtype
              : 'auto',
        })),

      updateThemeSettings: (partial) => {
        const current = get().themeSettings || DEFAULT_THEME_SETTINGS;
        const updated = { ...current, ...partial };
        set({ themeSettings: updated });
        applyThemeToDOM(updated);
      },

      resetThemeSettings: () => {
        set({ themeSettings: { ...DEFAULT_THEME_SETTINGS } });
        applyThemeToDOM(DEFAULT_THEME_SETTINGS);
      },

      applyPresetTheme: (presetId) => {
        const preset = THEME_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        const current = get().themeSettings || DEFAULT_THEME_SETTINGS;
        const updated = { ...current, ...preset.settings };
        set({ themeSettings: updated });
        applyThemeToDOM(updated);
      },

      setActiveCultureIds: (ids, weights = {}) =>
        set({ activeCultureIds: ids, cultureWeights: weights }),

      setBatchCount: (count) => set({ batchCount: Math.max(1, count) }),

      setEngineConfig: (config) => {
        if (
          config.targetSubtype !== undefined &&
          config.targetSubtype !== 'auto' &&
          !getCategorySubtypes(get().activeCategory).includes(config.targetSubtype)
        ) {
          throw new Error(`Invalid subtype "${config.targetSubtype}" for ${get().activeCategory}`);
        }
        set((state) => ({
          temperature: config.temperature !== undefined ? config.temperature : state.temperature,
          markovOrder: config.markovOrder !== undefined ? config.markovOrder : state.markovOrder,
          targetSubtype: config.targetSubtype !== undefined ? config.targetSubtype : state.targetSubtype,
        }));
      },

      setAnglicizationConfig: (config) =>
        set((state) => ({
          anglicize: config.anglicize !== undefined ? config.anglicize : state.anglicize,
          anglicizeMode: config.anglicizeMode !== undefined ? config.anglicizeMode : state.anglicizeMode,
          exonymDualDisplay:
            config.exonymDualDisplay !== undefined ? config.exonymDualDisplay : state.exonymDualDisplay,
        })),

      globalAnglicize: (target = 'all', forceState) =>
        set((state) => {
          const anglicizationEngine = new AnglicizationEngine();
          const hasBatch = target === 'all' || target === 'batch';
          const hasPinned = target === 'all' || target === 'pinned';

          const targetEntities = [
            ...(hasBatch ? state.generatedBatch : []),
            ...(hasPinned ? state.pinnedEntities : []),
          ];
          const shouldEnable =
            forceState !== undefined
              ? forceState
              : !targetEntities.every((e) => e.anglicization?.enabled);

          const updateEntity = (entity: LoreEntity): LoreEntity => {
            const updatedChildren =
              entity.children && entity.children.length > 0
                ? entity.children.map(updateEntity)
                : entity.children;

            let res: LoreEntity;
            if (shouldEnable) {
              res = anglicizationEngine.anglicizeEntity(entity, {
                mode: state.anglicizeMode,
                exonymDualDisplay: state.exonymDualDisplay,
                cultureId: entity.cultureId,
              });
            } else {
              res = anglicizationEngine.revert(entity);
            }
            return { ...res, children: updatedChildren };
          };

          return {
            anglicize: shouldEnable,
            generatedBatch: hasBatch ? state.generatedBatch.map(updateEntity) : state.generatedBatch,
            pinnedEntities: hasPinned ? state.pinnedEntities.map(updateEntity) : state.pinnedEntities,
          };
        }),

      setCustomVocabulary: (vocab) =>
        set((state) => ({
          customVocabulary: {
            ...state.customVocabulary,
            ...vocab,
            customSeeds: {
              ...(state.customVocabulary?.customSeeds || {}),
              ...(vocab.customSeeds || {}),
            },
          },
        })),

      setActiveEntityId: (id) => set({ activeEntityId: id }),

      generateBatch: () => {
        const state = get();
        if (
          state.targetSubtype !== 'auto' &&
          !getCategorySubtypes(state.activeCategory).includes(state.targetSubtype)
        ) {
          throw new Error(`Invalid subtype "${state.targetSubtype}" for ${state.activeCategory}`);
        }
        set({ isGenerating: true });
        try {
          const normalizedCat = normalizeEntityCategory(state.activeCategory);
          const activeCultureIds =
            state.activeCultureIds && state.activeCultureIds.length > 0
              ? state.activeCultureIds
              : ['danubian_slavic'];

          const cultureProfiles = activeCultureIds
            .map((id) => getCultureById(id))
            .filter((c): c is CultureProfile => c !== undefined);

          const safeProfiles = cultureProfiles.length > 0 ? cultureProfiles : [cultures['danubian_slavic']];

          // Weighted culture sampler for multi-culture mashups
          const sampleCultureByWeight = (profiles: CultureProfile[]): CultureProfile => {
            if (profiles.length <= 1) return profiles[0];
            const totalWeight = profiles.reduce(
              (sum, p) => sum + Math.max(0.05, state.cultureWeights[p.id] ?? 1.0),
              0
            );
            let rand = Math.random() * totalWeight;
            for (const p of profiles) {
              const w = Math.max(0.05, state.cultureWeights[p.id] ?? 1.0);
              if (rand <= w) return p;
              rand -= w;
            }
            return profiles[profiles.length - 1];
          };

          const cultureContexts = new Map<string, ReturnType<typeof getAugmentedCultureAndVariables>>();
          const getContext = (culture: CultureProfile, featureSubtype?: GeographicFeatureType) => {
            const key = `${culture.id}:${featureSubtype ?? 'default'}`;
            let context = cultureContexts.get(key);
            if (!context) {
              context = getAugmentedCultureAndVariables(
                culture, state.customVocabulary, normalizedCat, { featureSubtype }
              );
              cultureContexts.set(key, context);
            }
            return context;
          };
          const models = new Map<string, MarkovNameGenerator>();
          const getModel = (featureSubtype?: GeographicFeatureType) => {
            const key = featureSubtype ?? 'default';
            let model = models.get(key);
            if (!model) {
              const weightedSeeds: WeightedSeeds[] = safeProfiles.map((culture) => ({
                seeds: getCultureSeeds(culture, normalizedCat, featureSubtype),
                weight: Math.max(0.05, state.cultureWeights[culture.id] ?? 1.0),
              }));
              const customRoots = getContext(safeProfiles[0], featureSubtype).uniqueCustomRoots;
              if (customRoots.length > 0) {
                weightedSeeds.push({ seeds: customRoots, weight: 3.5 });
              }
              model = new MarkovNameGenerator(undefined, { order: state.markovOrder });
              model.trainWithWeights(weightedSeeds);
              models.set(key, model);
            }
            return model;
          };

          const anglicizationEngine = new AnglicizationEngine();
          const newBatch: LoreEntity[] = [];

          for (let i = 0; i < state.batchCount; i++) {
            // Sample the primary culture for this entity according to user-defined weights
            const chosenCulture = sampleCultureByWeight(safeProfiles);
            let featureSubtype: GeographicFeatureType | undefined;
            let subtype =
              state.targetSubtype && state.targetSubtype !== 'auto' ? state.targetSubtype : undefined;

            if (normalizedCat === 'character') {
              if (!subtype) {
                const subtypes = ['Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan'];
                subtype = subtypes[i % subtypes.length];
              }
            } else if (normalizedCat === 'settlement') {
              if (!subtype) {
                const subtypes = ['Metropolis', 'Fortress', 'Town', 'Haven', 'Village'];
                subtype = subtypes[i % subtypes.length];
              }
            } else if (normalizedCat === 'geography') {
              if (subtype) {
                if (subtype.toLowerCase().includes('mountain') || subtype.toLowerCase().includes('peak') || subtype.toLowerCase().includes('pass')) {
                  featureSubtype = 'orogeny';
                } else if (subtype.toLowerCase().includes('river') || subtype.toLowerCase().includes('basin') || subtype.toLowerCase().includes('delta')) {
                  featureSubtype = 'hydrology';
                } else {
                  featureSubtype = 'wilds';
                }
              } else {
                const geoTypes: GeographicFeatureType[] = ['orogeny', 'hydrology', 'wilds'];
                const chosen = geoTypes[i % geoTypes.length];
                featureSubtype = chosen;
                subtype =
                  chosen === 'orogeny'
                    ? 'Mountain Range'
                    : chosen === 'hydrology'
                    ? 'River Basin'
                    : 'Primeval Woods';
              }
            } else if (normalizedCat === 'faction') {
              if (!subtype) subtype = 'Order';
            } else if (normalizedCat === 'artifact') {
              if (!subtype) subtype = 'Relic';
            }

            const chosenContext = getContext(chosenCulture, featureSubtype);
            const markov = getModel(featureSubtype);
            const grammarEngine = new RecursiveGrammarEngine({
              markov,
              culture: chosenContext.augmentedCulture,
              temperature: state.temperature,
            });
            const candidateTemplates =
              chosenContext.templates.length > 0 ? chosenContext.templates : ['{root}'];
            const template = candidateTemplates[i % candidateTemplates.length];
            const itemVariables = { ...chosenContext.customVariables };
            if (safeProfiles.length > 1 && Math.random() < 0.4) {
              const secondaryContext = getContext(sampleCultureByWeight(safeProfiles), featureSubtype);
              if (secondaryContext.customVariables['surname']) {
                itemVariables['surname'] = secondaryContext.customVariables['surname'];
              }
            }

            let resolvedName = grammarEngine.resolve(template, {
              culture: chosenContext.augmentedCulture,
              markov,
              customVariables: itemVariables,
              featureSubtype,
              temperature: state.temperature,
              markovOrder: state.markovOrder,
            });

            if (!resolvedName || resolvedName.includes('{')) {
              resolvedName = markov.generate({ temperature: state.temperature });
            }

            const rootGuess = resolvedName.split(/\s+/)[0] || resolvedName;
            const entityId = `entity-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;

            let entity: LoreEntity = {
              id: entityId,
              name: resolvedName,
              originalName: resolvedName,
              originalRoot: rootGuess,
              rootName: rootGuess,
              category: normalizedCat,
              cultureId: chosenCulture.id,
              cultureIds: activeCultureIds.length > 1 ? [...activeCultureIds] : undefined,
              subtype,
              featureSubtype,
              children: [],
              pinned: false,
              createdAt: Date.now(),
            };

            if (state.anglicize) {
              entity = anglicizationEngine.anglicizeEntity(entity, {
                mode: state.anglicizeMode,
                exonymDualDisplay: state.exonymDualDisplay,
                cultureId: chosenCulture.id,
              });
            }

            newBatch.push(entity);
          }

          set({ generatedBatch: newBatch });
          return newBatch;
        } finally {
          set({ isGenerating: false });
        }
      },

      branchEntity: (parentId, childSubtype = 'auto', count = 1) => {
        const state = get();
        const parent =
          findEntityInTree(state.generatedBatch, parentId) ||
          findEntityInTree(state.pinnedEntities, parentId);

        if (!parent) return [];

        const parentCulture = getCultureById(parent.cultureId) ?? cultures['danubian_slavic'];
        const { customVariables, augmentedCulture } = getAugmentedCultureAndVariables(
          parentCulture,
          state.customVocabulary,
          parent.category
        );

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
          culture: augmentedCulture,
          customVariables,
        });

        const updater = (p: LoreEntity): LoreEntity => ({
          ...p,
          lastBranchSubtype:
            childSubtype !== 'auto'
              ? childSubtype
              : p.lastBranchSubtype || (newChildren[0]?.subtype ?? p.lastBranchSubtype),
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

      setEntityBranchSubtype: (entityId, subtype) => {
        const updater = (ent: LoreEntity): LoreEntity => ({
          ...ent,
          lastBranchSubtype: subtype,
        });
        const state = get();
        const batchRes = updateEntityInTree(state.generatedBatch, entityId, updater);
        const pinnedRes = updateEntityInTree(state.pinnedEntities, entityId, updater);
        set({
          generatedBatch: batchRes.list,
          pinnedEntities: pinnedRes.list,
        });
      },

      reRollEntity: (entityId) => {
        const state = get();
        const target =
          findEntityInTree(state.generatedBatch, entityId) ||
          findEntityInTree(state.pinnedEntities, entityId);

        if (!target) return undefined;

        const anglicizationEngine = new AnglicizationEngine();

        // If entity has parentId, use LineageBranchingEngine to maintain lineage consistency
        if (target.parentId) {
          const parent =
            findEntityInTree(state.generatedBatch, target.parentId) ||
            findEntityInTree(state.pinnedEntities, target.parentId);

          if (parent) {
            const parentCulture = getCultureById(parent.cultureId) ?? cultures['danubian_slavic'];
            const { customVariables, augmentedCulture } = getAugmentedCultureAndVariables(
              parentCulture,
              state.customVocabulary,
              parent.category
            );

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
              culture: augmentedCulture,
              customVariables,
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
        const baseCulture = getCultureById(target.cultureId) ?? cultures['danubian_slavic'];
        const { customVariables, augmentedCulture, uniqueCustomRoots, templates } = getAugmentedCultureAndVariables(
          baseCulture,
          state.customVocabulary,
          target.category,
          { featureSubtype: target.featureSubtype }
        );

        const markov = new MarkovNameGenerator(undefined, { order: state.markovOrder });
        const seeds = [
          ...uniqueCustomRoots,
          ...getCultureSeeds(augmentedCulture, target.category, target.featureSubtype),
        ];
        markov.train(seeds);

        const grammarEngine = new RecursiveGrammarEngine({
          markov,
          culture: augmentedCulture,
          temperature: state.temperature,
        });
        const candidateTemplates = templates.length > 0 ? templates : ['{root}'];
        const template = candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];

        let newName = grammarEngine.resolve(template, {
          culture: augmentedCulture,
          markov,
          customVariables,
          featureSubtype: target.featureSubtype,
          temperature: state.temperature,
          markovOrder: state.markovOrder,
        });
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

        const shouldAnglicize = target.anglicization?.enabled ?? state.anglicize;
        if (shouldAnglicize) {
          updatedEntity = anglicizationEngine.anglicizeEntity(updatedEntity, {
            mode: target.anglicization?.mode ?? state.anglicizeMode,
            exonymDualDisplay: target.anglicization?.exonymDualDisplay ?? state.exonymDualDisplay,
            cultureId: target.cultureId,
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
        const current =
          findEntityInTree(state.generatedBatch, entity.id) ??
          findEntityInTree(state.pinnedEntities, entity.id) ??
          entity;
        const updatedPinned = isAlreadyPinned
          ? state.pinnedEntities.filter((p) => p.id !== entity.id)
          : [...state.pinnedEntities, cloneEntityTree(current)];
        const pinnedIds = new Set(updatedPinned.map((p) => p.id));
        set({
          pinnedEntities: synchronizePins(updatedPinned, pinnedIds),
          generatedBatch: synchronizePins(state.generatedBatch, pinnedIds),
        });
      },

      pinAllBatch: () => {
        const state = get();
        if (state.generatedBatch.length === 0) return;

        const allPinned = state.generatedBatch.every((b) =>
          state.pinnedEntities.some((p) => p.id === b.id)
        );

        if (allPinned) {
          // Unpin all batch items
          const batchIds = new Set(state.generatedBatch.map((b) => b.id));
          const updatedPinned = state.pinnedEntities.filter((p) => !batchIds.has(p.id));
          const pinnedIds = new Set(updatedPinned.map((p) => p.id));
          set({
            pinnedEntities: synchronizePins(updatedPinned, pinnedIds),
            generatedBatch: synchronizePins(state.generatedBatch, pinnedIds),
          });
        } else {
          // Pin all batch items
          const existingPinnedIds = new Set(state.pinnedEntities.map((p) => p.id));
          const newPins = state.generatedBatch
            .filter((b) => !existingPinnedIds.has(b.id))
            .map((b) => ({ ...cloneEntityTree(b), pinned: true }));
          const updatedPinned = [...state.pinnedEntities, ...newPins];
          const pinnedIds = new Set(updatedPinned.map((p) => p.id));
          set({
            pinnedEntities: synchronizePins(updatedPinned, pinnedIds),
            generatedBatch: synchronizePins(state.generatedBatch, pinnedIds),
          });
        }
      },

      reRollBatch: () => {
        return get().generateBatch();
      },

      deleteEntity: (entityId: string) => {
        const state = get();
        const batchRes = removeEntityFromTree(state.generatedBatch, entityId);
        const pinnedRes = removeEntityFromTree(state.pinnedEntities, entityId);

        if (!batchRes.removed && !pinnedRes.removed) {
          return false;
        }

        const nextActiveId = state.activeEntityId === entityId ? null : state.activeEntityId;

        set({
          generatedBatch: batchRes.list,
          pinnedEntities: pinnedRes.list,
          activeEntityId: nextActiveId,
        });

        return true;
      },

      saveProjectBible: (name = 'Nomata World Bible') => {
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

      loadProjectBible: (input) => {
        validateProjectBible(input);
        const bible = structuredClone(input);
        const pinnedIds = new Set(bible.pinnedEntityIds);
        const entities = bible.entities.map(cloneEntityTree);
        const pinned = bible.pinnedEntityIds.map((id) => findEntityInTree(entities, id)!);
        const batch = entities.filter((e) => !pinnedIds.has(e.id));

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
          pinnedEntities: synchronizePins(pinned, pinnedIds),
          generatedBatch: synchronizePins(batch, pinnedIds),
          activeEntityId: null,
          targetSubtype: 'auto',
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
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          reportPersistenceError(
            `Saved project could not be restored. ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
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
        themeSettings: state.themeSettings,
      }),
    }
  )
);

type NominaStoreHook = {
  (): NominaState;
  <U>(selector: (state: NominaState) => U): U;
} & typeof useRawNominaStore;

export const useNominaStore: NominaStoreHook = Object.assign(
  ((selector?: (state: NominaState) => unknown) => {
    if (typeof window === 'undefined') {
      return selector ? selector(useRawNominaStore.getState()) : useRawNominaStore.getState();
    }
    return useRawNominaStore(selector ?? ((s) => s));
  }) as unknown as NominaStoreHook,
  useRawNominaStore
);
