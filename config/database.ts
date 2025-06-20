import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Database Configuration
 *
 * PostgreSQL uses UUIDv7 for primary keys (generated via gen_random_uuid_v7).
 */
const dbConfig = defineConfig({
  connection: 'pg',
  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('PG_HOST'),
        port: env.get('PG_PORT', 5432),
        user: env.get('PG_USER'),
        password: env.get('PG_PASSWORD', ''),
        database: env.get('PG_DATABASE'),
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
