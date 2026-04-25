import { defineConfig } from '@adonisjs/lucid'

import env from '#start/env'

/**
 * Database Configuration
 *
 * PostgreSQL uses UUIDv7 for primary keys (generated via gen_random_uuid_v7).
 */
const pgHost = env.get('PG_HOST')
const pgUser = env.get('PG_USER')
const nodeEnv = env.get('NODE_ENV')
const developmentPgDatabase = env.get('PG_DATABASE')
const testPgDatabase = env.get('PG_TEST_DATABASE')
const dedicatedTestDatabasePattern = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

if (nodeEnv === 'test' && (!testPgDatabase || !dedicatedTestDatabasePattern.test(testPgDatabase))) {
  throw new Error('NODE_ENV=test requires PG_TEST_DATABASE to be a dedicated test database')
}

const pgDatabase = nodeEnv === 'test' ? testPgDatabase : developmentPgDatabase

function boundedMilliseconds(
  name: string,
  value: number,
  minimum: number = 100,
  maximum: number = 600_000
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

const connectionTimeoutMillis = boundedMilliseconds(
  'PG_CONNECTION_TIMEOUT_MS',
  env.get('PG_CONNECTION_TIMEOUT_MS', 5_000)
)
const poolAcquireTimeoutMillis = boundedMilliseconds(
  'PG_POOL_ACQUIRE_TIMEOUT_MS',
  env.get('PG_POOL_ACQUIRE_TIMEOUT_MS', 5_000)
)
const poolCreateTimeoutMillis = boundedMilliseconds(
  'PG_POOL_CREATE_TIMEOUT_MS',
  env.get('PG_POOL_CREATE_TIMEOUT_MS', 5_000)
)
const statementTimeoutMillis = boundedMilliseconds(
  'PG_STATEMENT_TIMEOUT_MS',
  env.get('PG_STATEMENT_TIMEOUT_MS', 30_000)
)
const queryTimeoutMillis = boundedMilliseconds(
  'PG_QUERY_TIMEOUT_MS',
  env.get('PG_QUERY_TIMEOUT_MS', 30_000)
)

const pgConnection = {
  ...(pgHost !== undefined ? { host: pgHost } : {}),
  port: env.get('PG_PORT', 5432),
  ...(pgUser !== undefined ? { user: pgUser } : {}),
  password: env.get('PG_PASSWORD', ''),
  ...(pgDatabase !== undefined ? { database: pgDatabase } : {}),
  application_name: 'suar',
  connectionTimeoutMillis,
  statement_timeout: statementTimeoutMillis,
  query_timeout: queryTimeoutMillis,
}

const dbConfig = defineConfig({
  connection: 'pg',
  connections: {
    pg: {
      client: 'pg',
      connection: pgConnection,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      pool: {
        min: 2,
        max: 20,
        acquireTimeoutMillis: poolAcquireTimeoutMillis,
        createTimeoutMillis: poolCreateTimeoutMillis,
        idleTimeoutMillis: 30_000,
        propagateCreateError: false,
      },
      debug: false,
      searchPath: ['public', 'suar'],
    },
  },
})

export default dbConfig
