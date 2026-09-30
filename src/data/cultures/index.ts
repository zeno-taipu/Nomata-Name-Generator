import type { CultureProfile } from '../../types/domain';
import danubianSlavicJson from './danubian_slavic.json';
import celticGaelicJson from './celtic_gaelic.json';
import nordicScandianJson from './nordic_scandian.json';
import grecoAegeanJson from './greco_aegean.json';
import levantineSemiticJson from './levantine_semitic.json';
export { validateCultureProfile } from './validate';

export const cultures: Record<string, CultureProfile> = {
  danubian_slavic: danubianSlavicJson as CultureProfile,
  celtic_gaelic: celticGaelicJson as CultureProfile,
  nordic_scandian: nordicScandianJson as CultureProfile,
  greco_aegean: grecoAegeanJson as CultureProfile,
  levantine_semitic: levantineSemiticJson as CultureProfile,
};

export const cultureList: CultureProfile[] = Object.values(cultures);

/**
 * Retrieve a culture profile by unique identifier
 */
export function getCultureById(id: string): CultureProfile | undefined {
  return cultures[id];
}

/**
 * Get all supported culture profile identifiers
 */
export function getCultureIds(): string[] {
  return Object.keys(cultures);
}
