import { CACHE_MAX_TTL_SECONDS } from '#modules/cache/public_contracts/cache_contract'

export const CACHE_GENERATION_CONTROL_DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60
export const CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS = CACHE_MAX_TTL_SECONDS + 1
export const CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS = 90 * 24 * 60 * 60

/**
 * A bounded sliding lifecycle keeps active namespaces warm while allowing
 * controls for deleted tenants and users to disappear without a keyspace scan.
 * The lower bound is longer than any payload TTL to avoid needless cold churn.
 */
export function resolveCacheGenerationControlTtlSeconds(configuredValue?: string | number): number {
  const ttlSeconds =
    configuredValue === undefined
      ? CACHE_GENERATION_CONTROL_DEFAULT_TTL_SECONDS
      : typeof configuredValue === 'number'
        ? configuredValue
        : Number(configuredValue)

  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS ||
    ttlSeconds > CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS
  ) {
    throw new RangeError(
      `Cache generation control TTL must be an integer between ${CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS} and ${CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS} seconds`
    )
  }

  return ttlSeconds
}
