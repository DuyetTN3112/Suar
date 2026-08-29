import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { areRedisEndpointAddressesEqual } from '#modules/cache/domain/cache-runtime/redis_endpoint_identity'

const TEST_NAME_PATTERN = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const readDotEnvValue = (key: string): string | undefined => {
  const envPath = path.join(PROJECT_ROOT, '.env')
  if (!fs.existsSync(envPath)) {
    return undefined
  }

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const parsedKey = line.slice(0, separatorIndex).trim()
    if (parsedKey !== key) {
      continue
    }

    const parsedValue = line.slice(separatorIndex + 1).trim()
    if (!parsedValue) {
      return undefined
    }

    if (
      (parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
      (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
    ) {
      return parsedValue.slice(1, -1)
    }

    return parsedValue
  }

  return undefined
}

const isSafeTestName = (value: string | undefined): boolean => {
  return typeof value === 'string' && TEST_NAME_PATTERN.test(value)
}

const isUnsafeTestDatastoreAllowed = (): boolean => {
  return process.env['ALLOW_UNSAFE_TEST_DATASTORES'] === 'true'
}

const getUnsafeTestDatastoreBypassReason = (): string | undefined => {
  const reason = process.env['ALLOW_UNSAFE_TEST_DATASTORES_REASON']?.trim()
  return reason && reason.length > 0 ? reason : undefined
}

const readConfiguredValue = (key: string): string | undefined => {
  return process.env[key] ?? readDotEnvValue(key)
}

const applyOptionalOverride = (sourceKey: string, targetKey: string): void => {
  const value = readConfiguredValue(sourceKey)
  if (value !== undefined) {
    process.env[targetKey] = value
  }
}

const parseRedisDatabase = (value: string | undefined): number | null => {
  if (value === undefined || !/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 15 ? parsed : null
}

interface RedisTarget {
  host: string
  port: string
  db: number
}

interface RedisEndpoint {
  host: string
  port: string
}

interface ElasticsearchEndpoint {
  protocol: 'http:' | 'https:'
  host: string
  port: string
  pathname: string
}

let cacheEndpointBeforeTestOverride: RedisEndpoint | null | undefined
let elasticsearchNodeBeforeTestOverride: string | null | undefined

const sameRedisEndpoint = (first: RedisEndpoint, second: RedisEndpoint): boolean => {
  return areRedisEndpointAddressesEqual(first, second)
}

const sameRedisTarget = (first: RedisTarget, second: RedisTarget): boolean => {
  return sameRedisEndpoint(first, second) && first.db === second.db
}

const normalizeElasticsearchHost = (host: string): string => {
  const normalized = host.trim().toLowerCase().replace(/\.$/, '')
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(normalized) ? 'loopback' : normalized
}

const parseElasticsearchEndpoint = (value: string | undefined): ElasticsearchEndpoint | null => {
  if (!value) {
    return null
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    if (parsed.search || parsed.hash) {
      return null
    }

    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    return {
      protocol: parsed.protocol,
      host: normalizeElasticsearchHost(parsed.hostname),
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      pathname,
    }
  } catch {
    return null
  }
}

const sameElasticsearchEndpoint = (
  first: ElasticsearchEndpoint,
  second: ElasticsearchEndpoint
): boolean => {
  return (
    first.protocol === second.protocol &&
    first.host === second.host &&
    first.port === second.port &&
    first.pathname === second.pathname
  )
}

const isSafeElasticsearchTestPrefix = (value: string | undefined): boolean => {
  return Boolean(
    value && TEST_NAME_PATTERN.test(value) && value.length <= 128 && !/[\s,*?#[\]{}]/.test(value)
  )
}

export const applyTestDatastoreOverrides = (): void => {
  if (cacheEndpointBeforeTestOverride === undefined) {
    const baselineWasCaptured = process.env['SUAR_TEST_BASELINE_REDIS_CACHE_CAPTURED'] === 'true'
    const cacheHost = baselineWasCaptured
      ? process.env['SUAR_TEST_BASELINE_REDIS_CACHE_HOST']
      : readConfiguredValue('REDIS_CACHE_HOST')
    const cachePort = baselineWasCaptured
      ? process.env['SUAR_TEST_BASELINE_REDIS_CACHE_PORT']
      : readConfiguredValue('REDIS_CACHE_PORT')
    cacheEndpointBeforeTestOverride =
      cacheHost && cachePort ? { host: cacheHost, port: cachePort } : null
  }
  process.env['SUAR_TEST_BASELINE_REDIS_CACHE_CAPTURED'] = 'true'
  if (cacheEndpointBeforeTestOverride) {
    process.env['SUAR_TEST_BASELINE_REDIS_CACHE_HOST'] = cacheEndpointBeforeTestOverride.host
    process.env['SUAR_TEST_BASELINE_REDIS_CACHE_PORT'] = cacheEndpointBeforeTestOverride.port
  } else {
    delete process.env['SUAR_TEST_BASELINE_REDIS_CACHE_HOST']
    delete process.env['SUAR_TEST_BASELINE_REDIS_CACHE_PORT']
  }

  if (elasticsearchNodeBeforeTestOverride === undefined) {
    const baselineWasCaptured =
      process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED'] === 'true'
    const baselineNode = baselineWasCaptured
      ? process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE']
      : readConfiguredValue('ELASTICSEARCH_NODE')
    elasticsearchNodeBeforeTestOverride = baselineNode || null
  }
  process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED'] = 'true'
  if (elasticsearchNodeBeforeTestOverride) {
    process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE'] = elasticsearchNodeBeforeTestOverride
  } else {
    delete process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE']
  }

  const pgTestDatabase = process.env['PG_TEST_DATABASE'] ?? readDotEnvValue('PG_TEST_DATABASE')

  if (pgTestDatabase) {
    process.env['PG_TEST_DATABASE'] = pgTestDatabase
    process.env['PG_DATABASE'] = pgTestDatabase
  }

  for (const [sourceKey, targetKey] of [
    ['REDIS_TEST_HOST', 'REDIS_HOST'],
    ['REDIS_TEST_PORT', 'REDIS_PORT'],
    ['REDIS_TEST_USERNAME', 'REDIS_USERNAME'],
    ['REDIS_TEST_PASSWORD', 'REDIS_PASSWORD'],
    ['REDIS_TEST_DB', 'REDIS_DB'],
    ['REDIS_CACHE_TEST_HOST', 'REDIS_CACHE_HOST'],
    ['REDIS_CACHE_TEST_PORT', 'REDIS_CACHE_PORT'],
    ['REDIS_CACHE_TEST_USERNAME', 'REDIS_CACHE_USERNAME'],
    ['REDIS_CACHE_TEST_PASSWORD', 'REDIS_CACHE_PASSWORD'],
    ['REDIS_CACHE_TEST_DB', 'REDIS_CACHE_DB'],
    ['ELASTICSEARCH_TEST_ENABLED', 'ELASTICSEARCH_ENABLED'],
    ['ELASTICSEARCH_TEST_NODE', 'ELASTICSEARCH_NODE'],
    ['ELASTICSEARCH_TEST_USERNAME', 'ELASTICSEARCH_USERNAME'],
    ['ELASTICSEARCH_TEST_PASSWORD', 'ELASTICSEARCH_PASSWORD'],
    ['ELASTICSEARCH_TEST_INDEX_PREFIX', 'ELASTICSEARCH_INDEX_PREFIX'],
  ] as const) {
    applyOptionalOverride(sourceKey, targetKey)
  }
}

export const assertSafeTestDatastores = async (): Promise<void> => {
  if (isUnsafeTestDatastoreAllowed()) {
    const reason = getUnsafeTestDatastoreBypassReason()
    if (!reason) {
      throw new Error(
        [
          'Unsafe test datastore bypass requested.',
          'ALLOW_UNSAFE_TEST_DATASTORES_REASON is required when ALLOW_UNSAFE_TEST_DATASTORES=true.',
        ].join(' ')
      )
    }

    console.warn(`[test-datastore-guard] Unsafe datastore bypass enabled: ${reason}`)
    return
  }

  const envModule = await import('#start/env')
  const env = envModule.default

  const pgDatabase = process.env['PG_DATABASE'] ?? env.get('PG_DATABASE', '')
  const issues: string[] = []

  if (!isSafeTestName(pgDatabase)) {
    issues.push(`PG_DATABASE="${pgDatabase}" is not a dedicated test database`)
  }

  const mainTestDbRaw = readConfiguredValue('REDIS_TEST_DB')
  const cacheTestDbRaw = readConfiguredValue('REDIS_CACHE_TEST_DB')
  const mainTestDb = parseRedisDatabase(mainTestDbRaw)
  const cacheTestDb = parseRedisDatabase(cacheTestDbRaw)

  if (mainTestDb === null) {
    issues.push(
      `REDIS_TEST_DB="${mainTestDbRaw ?? ''}" must explicitly select a standalone Redis test DB from 0 to 15`
    )
  }
  if (cacheTestDb === null) {
    issues.push(
      `REDIS_CACHE_TEST_DB="${cacheTestDbRaw ?? ''}" must explicitly select a standalone Redis test DB from 0 to 15`
    )
  }

  if (mainTestDb !== null && cacheTestDb !== null) {
    const activeMainTarget: RedisTarget = {
      host: process.env['REDIS_HOST'] ?? env.get('REDIS_HOST'),
      port: String(process.env['REDIS_PORT'] ?? env.get('REDIS_PORT')),
      db: Number(process.env['REDIS_DB'] ?? env.get('REDIS_DB', 0)),
    }
    const activeCacheTarget: RedisTarget = {
      host: process.env['REDIS_CACHE_HOST'] ?? env.get('REDIS_CACHE_HOST', activeMainTarget.host),
      port: String(
        process.env['REDIS_CACHE_PORT'] ??
          env.get('REDIS_CACHE_PORT', Number(activeMainTarget.port))
      ),
      db: Number(process.env['REDIS_CACHE_DB'] ?? env.get('REDIS_CACHE_DB', 1)),
    }
    const expectedMainTarget: RedisTarget = {
      host: readConfiguredValue('REDIS_TEST_HOST') ?? activeMainTarget.host,
      port: readConfiguredValue('REDIS_TEST_PORT') ?? activeMainTarget.port,
      db: mainTestDb,
    }
    const expectedCacheTarget: RedisTarget = {
      host: readConfiguredValue('REDIS_CACHE_TEST_HOST') ?? activeCacheTarget.host,
      port: readConfiguredValue('REDIS_CACHE_TEST_PORT') ?? activeCacheTarget.port,
      db: cacheTestDb,
    }

    if (!sameRedisTarget(activeMainTarget, expectedMainTarget)) {
      issues.push('active main Redis connection does not match REDIS_TEST_*')
    }
    if (!sameRedisTarget(activeCacheTarget, expectedCacheTarget)) {
      issues.push('active cache Redis connection does not match REDIS_CACHE_TEST_*')
    }
    if (sameRedisTarget(expectedMainTarget, expectedCacheTarget)) {
      issues.push('main and cache Redis test data planes must not share one host/port/DB tuple')
    }
    if (
      cacheEndpointBeforeTestOverride &&
      sameRedisEndpoint(expectedCacheTarget, cacheEndpointBeforeTestOverride)
    ) {
      issues.push(
        'cache Redis tests must use a physically separate host/port from the configured development cache plane'
      )
    }

    const configuredMainDb = parseRedisDatabase(readDotEnvValue('REDIS_DB'))
    const configuredCacheDb = parseRedisDatabase(readDotEnvValue('REDIS_CACHE_DB'))
    if (configuredMainDb !== null) {
      const configuredMainTarget: RedisTarget = {
        host: readDotEnvValue('REDIS_HOST') ?? activeMainTarget.host,
        port: readDotEnvValue('REDIS_PORT') ?? activeMainTarget.port,
        db: configuredMainDb,
      }
      if (sameRedisTarget(expectedMainTarget, configuredMainTarget)) {
        issues.push('REDIS_TEST_* resolves to the configured non-test main Redis data plane')
      }
    }
    if (configuredCacheDb !== null) {
      const configuredCacheTarget: RedisTarget = {
        host:
          readDotEnvValue('REDIS_CACHE_HOST') ??
          readDotEnvValue('REDIS_HOST') ??
          activeCacheTarget.host,
        port:
          readDotEnvValue('REDIS_CACHE_PORT') ??
          readDotEnvValue('REDIS_PORT') ??
          activeCacheTarget.port,
        db: configuredCacheDb,
      }
      if (sameRedisTarget(expectedCacheTarget, configuredCacheTarget)) {
        issues.push('REDIS_CACHE_TEST_* resolves to the configured non-test cache Redis data plane')
      }
    }
  }

  const activeElasticsearchNode =
    process.env['ELASTICSEARCH_NODE'] ?? env.get('ELASTICSEARCH_NODE', '')
  const expectedElasticsearchTestNode = readConfiguredValue('ELASTICSEARCH_TEST_NODE')
  const activeElasticsearchPrefix =
    process.env['ELASTICSEARCH_INDEX_PREFIX'] ?? env.get('ELASTICSEARCH_INDEX_PREFIX', '')
  const expectedElasticsearchTestPrefix = readConfiguredValue('ELASTICSEARCH_TEST_INDEX_PREFIX')
  const activeElasticsearchEndpoint = parseElasticsearchEndpoint(activeElasticsearchNode)
  const expectedElasticsearchTestEndpoint = parseElasticsearchEndpoint(
    expectedElasticsearchTestNode
  )
  const baselineElasticsearchNode =
    elasticsearchNodeBeforeTestOverride === undefined
      ? process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED'] === 'true'
        ? process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE']
        : readDotEnvValue('ELASTICSEARCH_NODE')
      : (elasticsearchNodeBeforeTestOverride ?? undefined)
  const baselineElasticsearchEndpoint = parseElasticsearchEndpoint(baselineElasticsearchNode)

  if (!expectedElasticsearchTestNode) {
    issues.push('ELASTICSEARCH_TEST_NODE must select a dedicated Elasticsearch test service')
  } else if (!expectedElasticsearchTestEndpoint) {
    issues.push(
      `ELASTICSEARCH_TEST_NODE="${expectedElasticsearchTestNode}" must be a valid HTTP(S) endpoint without query or fragment`
    )
  }

  if (!activeElasticsearchEndpoint) {
    issues.push(
      `ELASTICSEARCH_NODE="${activeElasticsearchNode}" must resolve to the active Elasticsearch test endpoint`
    )
  } else if (
    expectedElasticsearchTestEndpoint &&
    !sameElasticsearchEndpoint(activeElasticsearchEndpoint, expectedElasticsearchTestEndpoint)
  ) {
    issues.push('active Elasticsearch connection does not match ELASTICSEARCH_TEST_NODE')
  }

  if (
    expectedElasticsearchTestEndpoint &&
    baselineElasticsearchEndpoint &&
    sameElasticsearchEndpoint(expectedElasticsearchTestEndpoint, baselineElasticsearchEndpoint)
  ) {
    issues.push(
      'Elasticsearch tests must use a physically separate endpoint from the configured development search plane'
    )
  }

  if (!isSafeElasticsearchTestPrefix(expectedElasticsearchTestPrefix)) {
    issues.push(
      `ELASTICSEARCH_TEST_INDEX_PREFIX="${expectedElasticsearchTestPrefix ?? ''}" must be a bounded test-only prefix without wildcards`
    )
  }
  if (activeElasticsearchPrefix !== expectedElasticsearchTestPrefix) {
    issues.push('active Elasticsearch index prefix does not match ELASTICSEARCH_TEST_INDEX_PREFIX')
  }

  if (issues.length > 0) {
    throw new Error(
      [
        'Unsafe integration test datastore configuration detected.',
        ...issues,
        'Set PG_TEST_DATABASE, explicit REDIS_TEST_*/REDIS_CACHE_TEST_* targets, and a physically isolated ELASTICSEARCH_TEST_* target before running integration tests.',
        'Or set ALLOW_UNSAFE_TEST_DATASTORES=true to intentionally run against the current configured datastores.',
      ].join(' ')
    )
  }
}

export const resetTestDatastoreGuardForTests = (): void => {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('Test datastore guard state can only be reset in NODE_ENV=test')
  }
  cacheEndpointBeforeTestOverride = undefined
  elasticsearchNodeBeforeTestOverride = undefined
  delete process.env['SUAR_TEST_BASELINE_REDIS_CACHE_CAPTURED']
  delete process.env['SUAR_TEST_BASELINE_REDIS_CACHE_HOST']
  delete process.env['SUAR_TEST_BASELINE_REDIS_CACHE_PORT']
  delete process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED']
  delete process.env['SUAR_TEST_BASELINE_ELASTICSEARCH_NODE']
}
