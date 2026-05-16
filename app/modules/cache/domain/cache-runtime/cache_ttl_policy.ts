/**
 * Rebuildable cache entries expire up to ten percent earlier than the caller's
 * maximum TTL. Downward-only jitter never extends the caller's staleness bound.
 */
export const CACHE_TTL_JITTER_FRACTION = 0.1

const utf8Encoder = new TextEncoder()

function stableHash32(value: string): number {
  let hash = 0x811c9dc5
  for (const byte of utf8Encoder.encode(value)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Spread different logical keys across a stable TTL window.
 *
 * Deterministic jitter gives every application process the same answer for the
 * same key, avoids test-only random injection, and distributes expiry waves
 * across keys. Session/token TTLs never use this policy because they live on the
 * main Redis data plane outside RedisCacheStore.
 */
export function cacheTtlWithDeterministicJitter(key: string, requestedTtl: number): number {
  const minimumTtl = Math.max(1, Math.ceil(requestedTtl * (1 - CACHE_TTL_JITTER_FRACTION)))
  const spread = requestedTtl - minimumTtl
  if (spread === 0) {
    return requestedTtl
  }

  const hashPrefix = stableHash32(key)
  return minimumTtl + (hashPrefix % (spread + 1))
}
