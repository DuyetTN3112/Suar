import { areRedisEndpointAddressesEqual } from './redis_endpoint_identity.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface RedisProductionPolicyInput {
  nodeEnv: 'development' | 'production' | 'test'
  main: { host: string; port: number; username?: string; password?: string; tlsEnabled: boolean }
  cache: { host: string; port: number; username?: string; password?: string; tlsEnabled: boolean }
  connectTimeoutMs: number
  commandTimeoutMs: number
  maxRetriesPerRequest: number
  sessionStore: 'cookie' | 'file' | 'redis' | 'memory'
  lockStore: 'redis' | 'memory'
  limiterStore: 'redis' | 'memory'
}

export function areRedisEndpointsDistinct(
  main: { host: string; port: number },
  cache: { host: string; port: number }
): boolean {
  return !areRedisEndpointAddressesEqual(main, cache)
}

export function assertRedisDataPlaneIsolation(input: {
  main: { host: string; port: number; db: number }
  cache: { host: string; port: number; db: number }
}): void {
  if (!areRedisEndpointsDistinct(input.main, input.cache) && input.main.db === input.cache.db) {
    throw new InvariantViolationException(
      'Unsafe Redis configuration: shared main/cache endpoint must use different logical DBs because FLUSHDB ignores key prefixes'
    )
  }
}

export function redisReconnectDelay(times: number, random: () => number = Math.random): number {
  const attempt = Number.isFinite(times) ? Math.max(1, Math.floor(times)) : 1
  const exponentialDelay = Math.min(100 * 2 ** Math.min(attempt - 1, 30), 3_000)
  const boundedRandom = Math.min(0.999_999, Math.max(0, random()))
  return exponentialDelay + Math.floor(boundedRandom * 100)
}

export function assertRedisProductionPolicy(input: RedisProductionPolicyInput): void {
  if (input.nodeEnv !== 'production') return

  const violations: string[] = []
  if (!input.main.password?.trim()) violations.push('REDIS_PASSWORD is required in production')
  if (!input.cache.password?.trim()) violations.push('REDIS_CACHE_PASSWORD is required in production')
  if (!input.main.username?.trim() || input.main.username.trim().toLowerCase() === 'default') {
    violations.push('REDIS_USERNAME must be a named non-default ACL user in production')
  }
  if (!input.cache.username?.trim() || input.cache.username.trim().toLowerCase() === 'default') {
    violations.push('REDIS_CACHE_USERNAME must be a named non-default ACL user in production')
  }
  if (!input.main.tlsEnabled) violations.push('REDIS_TLS_ENABLED must be true in production')
  if (!input.cache.tlsEnabled) violations.push('REDIS_CACHE_TLS_ENABLED must be true in production')
  if (!areRedisEndpointsDistinct(input.main, input.cache)) {
    violations.push('main and cache Redis must use different production endpoints; logical DBs are not isolation')
  }
  if (input.sessionStore !== 'redis') violations.push('SESSION_DRIVER must be redis in production')
  if (input.lockStore !== 'redis') violations.push('LOCK_STORE must be redis in production')
  if (input.limiterStore !== 'redis') violations.push('LIMITER_STORE must be redis in production')
  if (!Number.isSafeInteger(input.connectTimeoutMs) || input.connectTimeoutMs < 100 || input.connectTimeoutMs > 30_000) {
    violations.push('REDIS_CONNECT_TIMEOUT_MS must be between 100 and 30000')
  }
  if (!Number.isSafeInteger(input.commandTimeoutMs) || input.commandTimeoutMs < 100 || input.commandTimeoutMs > 30_000) {
    violations.push('REDIS_COMMAND_TIMEOUT_MS must be between 100 and 30000')
  }
  if (!Number.isSafeInteger(input.maxRetriesPerRequest) || input.maxRetriesPerRequest < 0 || input.maxRetriesPerRequest > 5) {
    violations.push('REDIS_MAX_RETRIES_PER_REQUEST must be between 0 and 5')
  }

  if (violations.length > 0) {
    throw new InvariantViolationException(
      `Unsafe Redis production configuration: ${violations.join('; ')}`
    )
  }
}
