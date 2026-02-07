import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Database Configuration
 *
 * Supports both MySQL (legacy) and PostgreSQL (migration target).
 * Set DB_CONNECTION env variable to switch between 'mysql' and 'pg'.
 *
 * PostgreSQL uses UUIDv7 for primary keys (generated via gen_random_uuid_v7).
 * MySQL uses INT AUTO_INCREMENT (legacy).
 *
 * Both connections can be active simultaneously for migration period.
 */
const dbConfig = defineConfig({
  connection: env.get('DB_CONNECTION', 'mysql'),
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
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
    },
    pg: {
      client: 'pg',
      connection: {
        host: env.get('PG_HOST', env.get('DB_HOST')),
        port: env.get('PG_PORT', 5432),
        user: env.get('PG_USER', env.get('DB_USER')),
        password: env.get('PG_PASSWORD', env.get('DB_PASSWORD', '')),
        database: env.get('PG_DATABASE', env.get('DB_DATABASE')),
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
