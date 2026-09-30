/** Bound retained models; keys preserve seed order and duplicates (training weights). */
export function cacheModel<T>(cache: Map<string, T>, key: string, model: T): void {
  if (cache.size >= 64 && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, model);
}
