import type { CacheRememberOptions } from '#modules/cache/public_contracts/cache_contract'

export interface CacheSingleFlightPolicy {
  waitTimeoutMs: number
  lockTtlMs: number
  heartbeatIntervalMs: number
  maxLeaseLifetimeMs: number
}

export const CACHE_SINGLE_FLIGHT_DEFAULT_WAIT_MS = 5_000
export const CACHE_SINGLE_FLIGHT_MIN_WAIT_MS = 100
export const CACHE_SINGLE_FLIGHT_MAX_WAIT_MS = 30_000
export const CACHE_SINGLE_FLIGHT_LOCK_TTL_MS = 2_000
export const CACHE_SINGLE_FLIGHT_HEARTBEAT_MS = 500

export function resolveCacheSingleFlightPolicy(
  options: CacheRememberOptions = {}
): CacheSingleFlightPolicy {
  const waitTimeoutMs = options.waitTimeoutMs ?? CACHE_SINGLE_FLIGHT_DEFAULT_WAIT_MS
  if (
    !Number.isSafeInteger(waitTimeoutMs) ||
    waitTimeoutMs < CACHE_SINGLE_FLIGHT_MIN_WAIT_MS ||
    waitTimeoutMs > CACHE_SINGLE_FLIGHT_MAX_WAIT_MS
  ) {
    throw new RangeError(
      `Cache single-flight wait timeout must be an integer between ${CACHE_SINGLE_FLIGHT_MIN_WAIT_MS} and ${CACHE_SINGLE_FLIGHT_MAX_WAIT_MS} milliseconds`
    )
  }

  return {
    waitTimeoutMs,
    lockTtlMs: CACHE_SINGLE_FLIGHT_LOCK_TTL_MS,
    heartbeatIntervalMs: CACHE_SINGLE_FLIGHT_HEARTBEAT_MS,
    // A hung callback cannot renew a lock forever. One final TTL window lets
    // another process take over after the documented wait budget is exhausted.
    maxLeaseLifetimeMs: waitTimeoutMs + CACHE_SINGLE_FLIGHT_LOCK_TTL_MS,
  }
}
