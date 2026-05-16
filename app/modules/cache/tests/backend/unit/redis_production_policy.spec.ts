import { spawnSync } from 'node:child_process'

import { test } from '@japa/runner'

import redisConfig from '#config/redis'
import {
  areRedisEndpointsDistinct,
  assertRedisDataPlaneIsolation,
  assertRedisProductionPolicy,
  redisReconnectDelay,
} from '#modules/cache/domain/cache-runtime/redis_production_policy'

function secureProductionConfig() {
  return {
    nodeEnv: 'production' as const,
    main: {
      host: 'redis-main.internal',
      port: 6379,
      username: 'suar-main',
      password: 'main-secret',
      tlsEnabled: true,
    },
    cache: {
      host: 'redis-cache.internal',
      port: 6379,
      username: 'suar-cache',
      password: 'cache-secret',
      tlsEnabled: true,
    },
    connectTimeoutMs: 5000,
    commandTimeoutMs: 2000,
    maxRetriesPerRequest: 2,
    sessionStore: 'redis' as const,
    lockStore: 'redis' as const,
    limiterStore: 'redis' as const,
  }
}

test.group('Redis production policy', () => {
  test('keeps cache Pub/Sub on a lazy connection without INFO ready checks', ({ assert }) => {
    const cache = redisConfig.connections.cache
    const cacheSubscriber = redisConfig.connections.cacheSubscriber

    assert.equal(cacheSubscriber.host, cache.host)
    assert.equal(cacheSubscriber.port, cache.port)
    assert.equal(cacheSubscriber.db, cache.db)
    assert.equal(cacheSubscriber.keyPrefix, cache.keyPrefix)
    assert.isTrue(cache.enableReadyCheck)
    assert.isFalse(cache.enableOfflineQueue)
    assert.isFalse(cacheSubscriber.enableReadyCheck)
    assert.isTrue(cacheSubscriber.enableOfflineQueue)
    assert.isTrue(cacheSubscriber.lazyConnect)
  })

  test('treats equivalent endpoint aliases as shared, not dedicated', ({ assert }) => {
    assert.isFalse(
      areRedisEndpointsDistinct(
        { host: '127.0.0.1', port: 6379 },
        { host: '127.0.0.1', port: 6379 }
      )
    )
    assert.isFalse(
      areRedisEndpointsDistinct(
        { host: 'LOCALHOST.', port: 6379 },
        { host: '127.42.0.1', port: 6379 }
      )
    )
    assert.isFalse(
      areRedisEndpointsDistinct(
        { host: '[::1]', port: 6379 },
        { host: '0:0:0:0:0:0:0:1', port: 6379 }
      )
    )
    assert.isFalse(
      areRedisEndpointsDistinct(
        { host: 'REDIS.INTERNAL.', port: 6379 },
        { host: 'redis.internal', port: 6379 }
      )
    )
    assert.isTrue(
      areRedisEndpointsDistinct(
        { host: 'redis-main', port: 6379 },
        { host: 'redis-cache', port: 6379 }
      )
    )
    assert.isTrue(
      areRedisEndpointsDistinct(
        { host: 'localhost', port: 6379 },
        { host: '127.999.0.1', port: 6379 }
      )
    )
  })

  test('keeps background reconnect alive with bounded backoff while requests fail fast', ({
    assert,
  }) => {
    assert.equal(
      redisReconnectDelay(1, () => 0),
      100
    )
    assert.equal(
      redisReconnectDelay(2, () => 0),
      200
    )
    assert.equal(
      redisReconnectDelay(8, () => 0),
      3_000
    )
    assert.equal(
      redisReconnectDelay(10_000, () => 1),
      3_099
    )
  })

  test('rejects shared endpoint and logical DB even outside production', ({ assert }) => {
    assert.throws(
      () =>
        assertRedisDataPlaneIsolation({
          main: { host: 'localhost', port: 6379, db: 0 },
          cache: { host: 'localhost', port: 6379, db: 0 },
        }),
      /FLUSHDB ignores key prefixes/
    )
    assert.doesNotThrow(() =>
      assertRedisDataPlaneIsolation({
        main: { host: 'localhost', port: 6379, db: 0 },
        cache: { host: 'localhost', port: 6379, db: 1 },
      })
    )
  })

  test('accepts isolated authenticated endpoints with bounded client behavior', ({ assert }) => {
    assert.doesNotThrow(() => assertRedisProductionPolicy(secureProductionConfig()))
  })

  test('rejects unauthenticated logical-DB-only production topology', ({ assert }) => {
    const config = secureProductionConfig()

    assert.throws(
      () =>
        assertRedisProductionPolicy({
          ...config,
          main: {
            host: 'shared-redis',
            port: 6379,
            tlsEnabled: true,
          },
          cache: {
            host: 'shared-redis',
            port: 6379,
            tlsEnabled: true,
          },
        }),
      /REDIS_PASSWORD.*REDIS_CACHE_PASSWORD.*REDIS_USERNAME.*REDIS_CACHE_USERNAME.*logical DBs/
    )
  })

  test('rejects production topology hidden behind equivalent loopback aliases', ({ assert }) => {
    const config = secureProductionConfig()

    assert.throws(
      () =>
        assertRedisProductionPolicy({
          ...config,
          main: {
            ...config.main,
            host: 'localhost',
          },
          cache: {
            ...config.cache,
            host: '127.9.8.7',
          },
        }),
      /different production endpoints/
    )
  })

  test('wires alias rejection into the real production Redis config boot', ({ assert }) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import=@poppinss/ts-exec',
        '--input-type=module',
        '-e',
        "await import('./config/redis.ts')",
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5_000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          SESSION_DRIVER: 'redis',
          LOCK_STORE: 'redis',
          LIMITER_STORE: 'redis',
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
          REDIS_DB: '0',
          REDIS_USERNAME: 'suar-main',
          REDIS_PASSWORD: 'main-secret',
          REDIS_TLS_ENABLED: 'true',
          REDIS_CACHE_HOST: '127.0.0.42',
          REDIS_CACHE_PORT: '6379',
          REDIS_CACHE_DB: '1',
          REDIS_CACHE_USERNAME: 'suar-cache',
          REDIS_CACHE_PASSWORD: 'cache-secret',
          REDIS_CACHE_TLS_ENABLED: 'true',
        },
      }
    )
    const output = `${result.stdout}\n${result.stderr}`

    assert.equal(result.status, 1)
    assert.include(output, 'main and cache Redis must use different production endpoints')
    assert.notInclude(output, 'ECONNREFUSED')
  })

  test('rejects default ACL identities and plaintext production transports', ({ assert }) => {
    const config = secureProductionConfig()

    assert.throws(
      () =>
        assertRedisProductionPolicy({
          ...config,
          main: {
            ...config.main,
            username: 'default',
            tlsEnabled: false,
          },
          cache: {
            ...config.cache,
            username: '',
            tlsEnabled: false,
          },
        }),
      /non-default ACL user.*REDIS_CACHE_USERNAME.*REDIS_TLS_ENABLED.*REDIS_CACHE_TLS_ENABLED/
    )
  })

  test('rejects retry and timeout values that can hang or overload dependencies', ({ assert }) => {
    assert.throws(
      () =>
        assertRedisProductionPolicy({
          ...secureProductionConfig(),
          commandTimeoutMs: 60_000,
          maxRetriesPerRequest: 20,
        }),
      /COMMAND_TIMEOUT.*MAX_RETRIES/
    )
  })

  test('rejects process-local session, lock, and limiter stores in production', ({ assert }) => {
    assert.throws(
      () =>
        assertRedisProductionPolicy({
          ...secureProductionConfig(),
          sessionStore: 'memory',
          lockStore: 'memory',
          limiterStore: 'memory',
        }),
      /SESSION_DRIVER.*LOCK_STORE.*LIMITER_STORE/
    )
  })

  test('does not impose production topology on isolated tests', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertRedisProductionPolicy({
        ...secureProductionConfig(),
        nodeEnv: 'test',
        main: { host: 'localhost', port: 6379, tlsEnabled: false },
        cache: { host: 'localhost', port: 6379, tlsEnabled: false },
      })
    )
  })
})
