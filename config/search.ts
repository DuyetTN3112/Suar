import env from '#start/env'

function boundedInteger(name: string, value: number, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

export const searchConfig = {
  enabled: env.get('ELASTICSEARCH_ENABLED', env.get('NODE_ENV') === 'development'),
  node: env.get('ELASTICSEARCH_NODE', 'http://127.0.0.1:9200'),
  username: env.get('ELASTICSEARCH_USERNAME'),
  password: env.get('ELASTICSEARCH_PASSWORD'),
  indexPrefix: env.get('ELASTICSEARCH_INDEX_PREFIX', 'suar_'),
  requestTimeoutMs: boundedInteger(
    'ELASTICSEARCH_REQUEST_TIMEOUT_MS',
    env.get('ELASTICSEARCH_REQUEST_TIMEOUT_MS', 3_000),
    100,
    120_000
  ),
  discoveryCursorSecret: env.get('SEARCH_DISCOVERY_CURSOR_SECRET', env.get('APP_KEY')),
  discoveryCursorTtlMs: boundedInteger(
    'SEARCH_DISCOVERY_CURSOR_TTL_MS',
    Number(env.get('SEARCH_DISCOVERY_CURSOR_TTL_MS', '300000')),
    1_000,
    86_400_000
  ),
  maxRetries: boundedInteger(
    'ELASTICSEARCH_MAX_RETRIES',
    env.get('ELASTICSEARCH_MAX_RETRIES', 1),
    0,
    5
  ),
}

export const searchAdminConfig = {
  enabled: env.get('ELASTICSEARCH_ADMIN_ENABLED', false),
  apiKey: env.get('ELASTICSEARCH_ADMIN_API_KEY'),
  username: env.get('ELASTICSEARCH_ADMIN_USERNAME'),
  password: env.get('ELASTICSEARCH_ADMIN_PASSWORD'),
  servicePrincipalId: env.get('SEARCH_INDEX_ADMIN_SERVICE_PRINCIPAL_ID'),
  allowUnverifiedRollbackApply: env.get('ELASTICSEARCH_ADMIN_ALLOW_UNVERIFIED_ROLLBACK', false),
}

export function buildSearchIndexName(suffix: string): string {
  return `${searchConfig.indexPrefix}${suffix}`
}
