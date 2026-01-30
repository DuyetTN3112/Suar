import { defineConfig } from '@adonisjs/redis'
import type { InferConnections } from '@adonisjs/redis/types'

import {
  areRedisEndpointsDistinct,
  assertRedisDataPlaneIsolation,
  assertRedisProductionPolicy,
  redisReconnectDelay,
} from '#modules/cache/domain/redis_production_policy'
import { CACHE_REDIS_KEY_PREFIX } from '#modules/cache/public_contracts/cache_contract'
import env from '#start/env'

/**
 * Redis Configuration
 *
 * Connections:
 *   - main: Durable/security-sensitive data (sessions, locks, auth tokens)
 *   - cache: Rebuildable application cache
 *
 * REDIS_CACHE_HOST should point to a dedicated Redis deployment in production.
 * Logical DBs on one Redis process are only a development fallback: eviction,
 * memory limits, CPU, persistence, and availability are process-wide.
 */
const mainHost = env.get('REDIS_HOST', '127.0.0.1')
const mainPort = env.get('REDIS_PORT', 6379)
const cacheHost = env.get('REDIS_CACHE_HOST', mainHost)
const cachePort = env.get('REDIS_CACHE_PORT', mainPort)
const mainUsername = env.get('REDIS_USERNAME')
const mainPassword = env.get('REDIS_PASSWORD')
const configuredCacheUsername = env.get('REDIS_CACHE_USERNAME')
const configuredCachePassword = env.get('REDIS_CACHE_PASSWORD')
const cacheUsername = configuredCacheUsername ?? mainUsername
const cachePassword = configuredCachePassword ?? mainPassword
const mainTlsEnabled = env.get('REDIS_TLS_ENABLED', false)
const cacheTlsEnabled = env.get('REDIS_CACHE_TLS_ENABLED', mainTlsEnabled)
const usesDedicatedCacheEndpoint = areRedisEndpointsDistinct(
  { host: mainHost, port: mainPort },
  { host: cacheHost, port: cachePort }
)
const connectTimeout = env.get('REDIS_CONNECT_TIMEOUT_MS', 5000)
const commandTimeout = env.get('REDIS_COMMAND_TIMEOUT_MS', 2000)
const maxRetriesPerRequest = env.get('REDIS_MAX_RETRIES_PER_REQUEST', 2)
const mainDb = env.get('REDIS_DB', 0)
const cacheDb = env.get('REDIS_CACHE_DB', usesDedicatedCacheEndpoint ? 0 : 1)

assertRedisProductionPolicy({
  nodeEnv: env.get('NODE_ENV'),
  main: {
    host: mainHost,
    port: mainPort,
    ...(mainUsername ? { username: mainUsername } : {}),
    ...(mainPassword ? { password: mainPassword } : {}),
    tlsEnabled: mainTlsEnabled,
  },
  cache: {
    host: cacheHost,
    port: cachePort,
    ...(configuredCacheUsername ? { username: configuredCacheUsername } : {}),
    ...(configuredCachePassword ? { password: configuredCachePassword } : {}),
    tlsEnabled: cacheTlsEnabled,
  },
  connectTimeoutMs: connectTimeout,
  commandTimeoutMs: commandTimeout,
  maxRetriesPerRequest,
  sessionStore: env.get('SESSION_DRIVER', 'redis'),
  lockStore: env.get('LOCK_STORE'),
  limiterStore: env.get('LIMITER_STORE', env.get('NODE_ENV') === 'test' ? 'memory' : 'redis'),
})
assertRedisDataPlaneIsolation({
  main: { host: mainHost, port: mainPort, db: mainDb },
  cache: { host: cacheHost, port: cachePort, db: cacheDb },
})

function retryStrategy(times: number): number {
  return redisReconnectDelay(times)
}

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    /**
     * Main connection: sessions, locks, general purpose
     * DB 0 (default)
     */
    main: {
      host: mainHost,
      port: mainPort,
      ...(mainUsername ? { username: mainUsername } : {}),
      ...(mainPassword ? { password: mainPassword } : {}),
      db: mainDb,
      keyPrefix: 'suar:',
      connectTimeout,
      commandTimeout,
      maxRetriesPerRequest,
      retryStrategy,
      // Main is mandatory and starts eagerly. A short bounded offline queue avoids
      // rejecting the first session/limiter command during the initial handshake.
      enableOfflineQueue: true,
      enableReadyCheck: true,
      lazyConnect: false,
      keepAlive: 10_000,
      ...(mainTlsEnabled ? { tls: { servername: mainHost } } : {}),
    },

    /**
     * Cache connection: app cache only.
     * A shared development endpoint defaults to logical DB 1. Production uses a
     * physically separate endpoint and therefore DB 0.
     */
    cache: {
      host: cacheHost,
      port: cachePort,
      ...(cacheUsername ? { username: cacheUsername } : {}),
      ...(cachePassword ? { password: cachePassword } : {}),
      db: cacheDb,
      keyPrefix: CACHE_REDIS_KEY_PREFIX,
      connectTimeout,
      commandTimeout,
      maxRetriesPerRequest,
      retryStrategy,
      // Cache is optional on request paths: reject immediately while disconnected
      // so reads/population can fall back instead of waiting for reconnection.
      enableOfflineQueue: false,
      enableReadyCheck: true,
      lazyConnect: false,
      keepAlive: 10_000,
      ...(cacheTlsEnabled ? { tls: { servername: cacheHost } } : {}),
    },

    /**
     * Cache Pub/Sub connection.
     *
     * Adonis creates a second ioredis client when `subscribe` is called. That
     * client must not run the INFO-based ready check after entering subscriber
     * mode, because Redis rejects regular commands on RESP2 Pub/Sub clients.
     *
     * Keep this connection lazy so its unused command-side client never opens a
     * socket. The subscription itself starts the dedicated subscriber client.
     */
    cacheSubscriber: {
      host: cacheHost,
      port: cachePort,
      ...(cacheUsername ? { username: cacheUsername } : {}),
      ...(cachePassword ? { password: cachePassword } : {}),
      db: cacheDb,
      keyPrefix: CACHE_REDIS_KEY_PREFIX,
      connectTimeout,
      commandTimeout,
      maxRetriesPerRequest,
      retryStrategy,
      enableOfflineQueue: true,
      enableReadyCheck: false,
      lazyConnect: true,
      keepAlive: 10_000,
      ...(cacheTlsEnabled ? { tls: { servername: cacheHost } } : {}),
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
