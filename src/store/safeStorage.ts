import type { StateStorage } from 'zustand/middleware';
import { reportPersistenceError } from './persistenceStatus';

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!window.localStorage) throw new Error('Local storage is unavailable');
  return window.localStorage;
}

export function createSafeStorage(
  getStorage: () => Storage | undefined = browserStorage,
  reportError: (error: string | null) => void = reportPersistenceError
): StateStorage {
  const memory = new Map<string, string>();
  const pending = new Set<string>();

  function failed(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    reportError(`Changes are not saved to disk. Export your project before closing. ${detail}`);
  }

  return {
    getItem(key) {
      // Unsaved values (including deletions) take precedence over stale disk data.
      if (pending.has(key)) return memory.get(key) ?? null;
      try {
        const storage = getStorage();
        if (!storage) return memory.get(key) ?? null;
        const value = storage.getItem(key);
        if (value === null) memory.delete(key);
        else memory.set(key, value);
        return value;
      } catch (error) {
        failed(error);
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        const storage = getStorage();
        if (!storage) return;
        storage.setItem(key, value);
        pending.delete(key);
        if (pending.size === 0) reportError(null);
      } catch (error) {
        pending.add(key);
        failed(error);
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        const storage = getStorage();
        if (!storage) return;
        storage.removeItem(key);
        pending.delete(key);
        if (pending.size === 0) reportError(null);
      } catch (error) {
        pending.add(key);
        failed(error);
      }
    },
  };
}
