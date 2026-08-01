import type { CacheRememberOptions } from '#modules/cache/public_contracts/cache_contract'
import type { CacheRuntimeMetricsSnapshot } from '#modules/cache/public_contracts/cache_runtime_metrics'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface CacheKeyPage {
  keys: string[]
  nextCursor: string
}

export interface CacheStore {
  readonly ttl: number
  readonly prefix: string
  buildKey(...segments: (string | number)[]): string
  set(key: string, value: unknown, ttl?: number): Promise<void>
  setBestEffort(key: string, value: unknown, ttl?: number): Promise<boolean>
  get<T>(key: string, defaultValue?: T | null): Promise<T | null>
  getRawCacheValue(key: string): Promise<string | null>
  evalCacheScript(script: string, numberOfKeys: number, ...arguments_: string[]): Promise<unknown>
  publishCacheMessage(channel: string, message: string): Promise<number>
  subscribeToCacheChannel(channel: string, handler: (message: string) => void): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  deleteBestEffort(key: string): Promise<boolean>
  deleteByPattern(pattern: string): Promise<void>
  deleteByPatternBestEffort(pattern: string): Promise<boolean>
  scanKeys(pattern?: string, cursor?: string, count?: number): Promise<CacheKeyPage>
  remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
    options?: CacheRememberOptions
  ): Promise<T>
  resolveVersionedKeyBestEffort(
    namespace: string | readonly string[],
    logicalKey: string
  ): Promise<string | null>
  rotateGeneration(namespace: string): Promise<void>
  runtimeMetrics(): CacheRuntimeMetricsSnapshot
  prometheusMetrics(): { contentType: string; body: string }
  flush(): Promise<void>
}

export interface SingleFlight {
  execute<T>(key: string, callback: () => Promise<T>): Promise<T>
  isInFlight(key: string): boolean
  getInFlightCount(): number
  clear(): void
}

export interface CacheStoreProvider {
  cacheStore: CacheStore
  singleFlight: SingleFlight
}

let registeredProvider: CacheStoreProvider | undefined

export function registerCacheStoreProvider(nextProvider: CacheStoreProvider): void {
  if (
    registeredProvider &&
    (registeredProvider.cacheStore !== nextProvider.cacheStore ||
      registeredProvider.singleFlight !== nextProvider.singleFlight)
  ) {
    throw new InvariantViolationException('Cache store provider is already registered')
  }

  registeredProvider = nextProvider
}

function requireProvider(): CacheStoreProvider {
  if (!registeredProvider) {
    throw new InvariantViolationException('Cache store provider has not been registered')
  }
  return registeredProvider
}

export const cacheStore: CacheStore = {
  get ttl() {
    return requireProvider().cacheStore.ttl
  },
  get prefix() {
    return requireProvider().cacheStore.prefix
  },
  buildKey: (...segments) => requireProvider().cacheStore.buildKey(...segments),
  set: (key, value, ttl) => requireProvider().cacheStore.set(key, value, ttl),
  setBestEffort: (key, value, ttl) => requireProvider().cacheStore.setBestEffort(key, value, ttl),
  get: <T>(key: string, defaultValue: T | null = null) =>
    requireProvider().cacheStore.get<T>(key, defaultValue),
  getRawCacheValue: (key) => requireProvider().cacheStore.getRawCacheValue(key),
  evalCacheScript: (script, numberOfKeys, ...arguments_) =>
    requireProvider().cacheStore.evalCacheScript(script, numberOfKeys, ...arguments_),
  publishCacheMessage: (channel, message) =>
    requireProvider().cacheStore.publishCacheMessage(channel, message),
  subscribeToCacheChannel: (channel, handler) =>
    requireProvider().cacheStore.subscribeToCacheChannel(channel, handler),
  has: (key) => requireProvider().cacheStore.has(key),
  delete: (key) => requireProvider().cacheStore.delete(key),
  deleteBestEffort: (key) => requireProvider().cacheStore.deleteBestEffort(key),
  deleteByPattern: (pattern) => requireProvider().cacheStore.deleteByPattern(pattern),
  deleteByPatternBestEffort: (pattern) =>
    requireProvider().cacheStore.deleteByPatternBestEffort(pattern),
  scanKeys: (pattern, cursor, count) =>
    requireProvider().cacheStore.scanKeys(pattern, cursor, count),
  remember: <T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
    options?: CacheRememberOptions
  ) => requireProvider().cacheStore.remember(key, ttl, callback, options),
  resolveVersionedKeyBestEffort: (namespace, logicalKey) =>
    requireProvider().cacheStore.resolveVersionedKeyBestEffort(namespace, logicalKey),
  rotateGeneration: (namespace) => requireProvider().cacheStore.rotateGeneration(namespace),
  runtimeMetrics: () => requireProvider().cacheStore.runtimeMetrics(),
  prometheusMetrics: () => requireProvider().cacheStore.prometheusMetrics(),
  flush: () => requireProvider().cacheStore.flush(),
}

/**
 * Advanced cache-plane port for revisioned projections that require raw,
 * atomic Redis values. General application caching must use `cacheStore`.
 */
export const cacheRedisCommandStore = {
  get: (key: string) => cacheStore.getRawCacheValue(key),
  eval: (script: string, numberOfKeys: number, ...arguments_: string[]) =>
    cacheStore.evalCacheScript(script, numberOfKeys, ...arguments_),
  publish: (channel: string, message: string) => cacheStore.publishCacheMessage(channel, message),
} as const

/**
 * Dedicated cache-plane subscription port for composition roots. Keeping raw
 * connection ownership in RedisCacheStore prevents subscriber setup from
 * bypassing cache endpoint isolation and handshake policy.
 */
export const cacheRedisSubscriptionStore = {
  subscribe: (channel: string, handler: (message: string) => void) =>
    cacheStore.subscribeToCacheChannel(channel, handler),
} as const

export const cacheInvalidationStore = {
  async delete(key: string): Promise<void> {
    await cacheStore.deleteBestEffort(key)
  },
  async deleteByPattern(pattern: string): Promise<void> {
    await cacheStore.deleteByPatternBestEffort(pattern)
  },
} as const

export const singleFlight: SingleFlight = {
  execute: <T>(key: string, callback: () => Promise<T>) =>
    requireProvider().singleFlight.execute(key, callback),
  isInFlight: (key) => requireProvider().singleFlight.isInFlight(key),
  getInFlightCount: () => requireProvider().singleFlight.getInFlightCount(),
  clear: () => requireProvider().singleFlight.clear(),
}
