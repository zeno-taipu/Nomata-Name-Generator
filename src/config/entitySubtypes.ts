import { normalizeEntityCategory, type EntityCategory } from '../types/domain';

/** Shared generation choices. "auto" is deliberately included as the first option. */
const SUBTYPES_BY_CATEGORY = {
  character: ['auto', 'Noble', 'Warrior', 'Scholar', 'Wanderer', 'Artisan'],
  settlement: ['auto', 'Metropolis', 'Fortress', 'Town', 'Haven', 'Village'],
  geography: ['auto', 'Mountain Range', 'River Basin', 'Primeval Woods'],
  faction: ['auto', 'Order', 'Legion', 'Covenant', 'Guild', 'Syndicate'],
  artifact: ['auto', 'Relic', 'Blade', 'Crown', 'Tome', 'Scepter'],
} as const;

/** Accepts canonical categories and the legacy aliases declared by EntityCategory. */
export function getCategorySubtypes(category: EntityCategory): readonly string[] {
  return SUBTYPES_BY_CATEGORY[normalizeEntityCategory(category)];
}
