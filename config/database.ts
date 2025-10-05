import { defineConfig } from '@adonisjs/lucid'

import env from '#start/env'

/**
 * Database Configuration
 *
 * PostgreSQL uses UUIDv7 for primary keys (generated via gen_random_uuid_v7).
 */
const pgHost = env.get('PG_HOST')
const pgUser = env.get('PG_USER')
const pgDatabase = env.get('PG_DATABASE')

const dbConfig = defineConfig({
  connection: 'pg',
  connections: {
    pg: {
      client: 'pg',
      connection: {
        ...(pgHost !== undefined ? { host: pgHost } : {}),
        port: env.get('PG_PORT', 5432),
        ...(pgUser !== undefined ? { user: pgUser } : {}),
        password: env.get('PG_PASSWORD', ''),
        ...(pgDatabase !== undefined ? { database: pgDatabase } : {}),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      pool: {
        min: 2,
        max: 20,
      },
      debug: false,
      searchPath: ['public', 'suar'],
    },
  },
})

export default dbConfig
