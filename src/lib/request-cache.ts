/** Cache + in-flight dedup للطلبات المتكررة (30s افتراضي) */
const DEFAULT_TTL_MS = 30_000;

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
  force = false,
): Promise<T> {
  if (!force) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return Promise.resolve(hit.value as T);
    }
  } else {
    cache.delete(key);
  }

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function invalidateCacheKey(key: string): void {
  cache.delete(key);
  inFlight.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      inFlight.delete(key);
    }
  }
}

export function clearRequestCache(): void {
  cache.clear();
  inFlight.clear();
}
