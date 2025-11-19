import env from '#start/env'

export const searchConfig = {
  enabled: env.get('ELASTICSEARCH_ENABLED', env.get('NODE_ENV') !== 'production'),
  node: env.get('ELASTICSEARCH_NODE', 'http://127.0.0.1:9200'),
  username: env.get('ELASTICSEARCH_USERNAME'),
  password: env.get('ELASTICSEARCH_PASSWORD'),
  indexPrefix: env.get('ELASTICSEARCH_INDEX_PREFIX', 'suar_'),
  requestTimeoutMs: env.get('ELASTICSEARCH_REQUEST_TIMEOUT_MS', 3000),
}

export function buildSearchIndexName(suffix: string): string {
  return `${searchConfig.indexPrefix}${suffix}`
}
