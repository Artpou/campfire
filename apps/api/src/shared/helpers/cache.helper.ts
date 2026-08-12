import { LRUCache } from "lru-cache";

export interface CacheOptions<V> {
  max: number;
  ttl: number;
  name?: string;
  /** Called on eviction — useful for cleanup (e.g. closing connections). */
  dispose?: (value: V, key: string) => void;
}

export function createCache<V extends {}>(opts: CacheOptions<V>): LRUCache<string, V> {
  const cache = new LRUCache<string, V>({
    max: opts.max,
    ttl: opts.ttl,
    dispose: opts.dispose,
  });

  return cache;
}
