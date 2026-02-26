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
 *   - Redis main/cache test targets configured through `REDIS_TEST_*` and
 *     `REDIS_CACHE_TEST_*`
 *   - Physically separate Elasticsearch test service configured through
 *     `ELASTICSEARCH_TEST_NODE` and `ELASTICSEARCH_TEST_INDEX_PREFIX`
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { applyTestDatastoreOverrides, assertSafeTestDatastores } from './test_datastore_guard.js'

const TEST_APP_GLOBAL_KEY = Symbol.for('suar.test.app')

let app: ApplicationService | null = null
let ownsApp = false

function getSharedTestApp(): ApplicationService | null {
  return (
    ((globalThis as Record<PropertyKey, unknown>)[TEST_APP_GLOBAL_KEY] as
      | ApplicationService
      | undefined) ?? null
  )
}

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
  const sharedApp = getSharedTestApp()
  if (sharedApp) {
    app = sharedApp
    ownsApp = false
    return sharedApp
  }

  if (app) {
    return app
  }

  // Set test environment
  process.env['NODE_ENV'] = 'test'
  process.env['LOG_LEVEL'] = 'silent'
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

  // Start providers required by the integration runtime.
  await app.start(() => undefined)
  ownsApp = true

  return app
}

/**
 * Teardown the application after integration tests.
 * Call this in group.teardown().
 */
export async function teardownApp(): Promise<void> {
  if (!app) {
    return
  }

  if (!ownsApp) {
    app = null
    return
  }

  await closeTestRuntimeConnections()
  await app.terminate()
  app = null
  ownsApp = false
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
