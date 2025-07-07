/**
 * Integration Test Bootstrap
 *
 * Sets up the AdonisJS application context for integration tests
 * that need database access and service injection.
 *
 * Usage:
 *   import { setupApp, teardownApp, getApp } from '#tests/helpers/bootstrap'
 *
 *   test.group('MyGroup', (group) => {
 *     group.setup(() => setupApp())
 *     group.teardown(() => teardownApp())
 *
 *     test('something', async ({ assert }) => {
 *       const app = getApp()
 *       // ... use app.container to resolve services
 *     })
 *   })
 *
 * Prerequisites:
 *   - PostgreSQL running with a dedicated test database such as `suar_test`
 *   - Set `PG_TEST_DATABASE` to the dedicated PostgreSQL test database
 *   - Set `MONGODB_TEST_URL` to a dedicated MongoDB test database when Mongo-backed tests are enabled
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { applyTestDatastoreOverrides, assertSafeTestDatastores } from './test_datastore_guard.js'

let app: ApplicationService | null = null

async function closeTestRuntimeConnections(): Promise<void> {
  const [{ default: db }, { default: redis }] = await Promise.all([
    import('@adonisjs/lucid/services/db'),
    import('@adonisjs/redis/services/main'),
  ])

  await Promise.allSettled([db.manager.closeAll(), redis.quit()])
}

/**
 * Boot the AdonisJS application for integration testing.
 * Call this in group.setup().
 */
export async function setupApp(): Promise<ApplicationService> {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  applyTestDatastoreOverrides()
  await assertSafeTestDatastores()

  const { Ignitor } = await import('@adonisjs/core')

  const APP_ROOT = new URL('../../', import.meta.url)
  const IMPORTER = (filePath: string | URL) => {
    const filePathString = typeof filePath === 'string' ? filePath : filePath.href
    if (filePathString.startsWith('./') || filePathString.startsWith('../')) {
      return import(new URL(filePathString, APP_ROOT).href)
    }
    return import(filePathString)
  }

  const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })

  ignitor.tap((application) => {
    application.booting(() => {
      void import('#start/env')
    })
  })

  app = ignitor.createApp('console')
  await app.init()
  await app.boot()

  // Start providers (including MongooseProvider for MongoDB connection)
  await app.start(() => undefined)

  return app
}

/**
 * Teardown the application after integration tests.
 * Call this in group.teardown().
 */
export async function teardownApp(): Promise<void> {
  if (app) {
    await closeTestRuntimeConnections()
    await app.terminate()
    app = null
  }
}

/**
 * Get the current application instance.
 * Throws if setupApp() hasn't been called.
 */
export function getApp(): ApplicationService {
  if (!app) {
    throw new Error('App not initialized. Call setupApp() in group.setup() first.')
  }
  return app
}
