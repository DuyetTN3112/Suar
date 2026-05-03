import 'reflect-metadata'
import { createServer } from 'node:http'

import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { apiClient } from '@japa/api-client'
import { assert } from '@japa/assert'
import { fileSystem } from '@japa/file-system'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { configure, processCLIArgs, run } from '@japa/runner'
import { SpecReporter } from '@japa/spec-reporter'

import {
  applyTestDatastoreOverrides,
  assertSafeTestDatastores,
} from '../tests/helpers/test_datastore_guard.js'

process.env['NODE_ENV'] = 'test'
process.env['LOG_LEVEL'] = 'silent'
process.env['SESSION_DRIVER'] = 'memory'
process.env['ELASTICSEARCH_ENABLED'] ??= 'false'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string | URL) => {
  const filePathString = typeof filePath === 'string' ? filePath : filePath.href
  if (filePathString.startsWith('./') || filePathString.startsWith('../')) {
    return import(new URL(filePathString, APP_ROOT).href)
  }
  return import(filePathString)
}

const createSpecReporter = (...args: Parameters<SpecReporter['boot']>) => {
  const reporter = new SpecReporter()
  reporter.boot(...args)
}

const KNOWN_SUITES = new Set(['unit', 'integration', 'contract'])
const JAPA_SUITE_FILES = {
  unit: [
    'tests/unit/**/*.spec.ts',
    'tests/architecture/**/*.spec.ts',
    'app/modules/*/tests/backend/architecture/**/*.spec.ts',
    'app/modules/*/tests/backend/unit/**/*.spec.ts',
  ],
  integration: [
    'tests/integration/**/*.spec.ts',
    'app/modules/*/tests/backend/architecture/**/*.spec.ts',
    'app/modules/*/tests/backend/integration/**/*.spec.ts',
  ],
  contract: ['tests/contract/**/*.ts', 'app/modules/*/tests/backend/contract/**/*.spec.ts'],
} as const

const parseRequestedSuites = (argv: string[]): Set<string> | null => {
  const requestedSuites = new Set<string>()

  for (const arg of argv) {
    if (arg.startsWith('--suites=')) {
      const suites = arg
        .slice('--suites='.length)
        .split(',')
        .map((suite) => suite.trim())
        .filter((suite) => suite.length > 0)

      for (const suite of suites) {
        if (KNOWN_SUITES.has(suite)) {
          requestedSuites.add(suite)
        }
      }
      continue
    }

    if (KNOWN_SUITES.has(arg)) {
      requestedSuites.add(arg)
    }
  }

  return requestedSuites.size > 0 ? requestedSuites : null
}

let reportedPgTerminationRejection = false

const normalizeThrownError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  return new Error(String(error))
}

const isIgnorablePgTerminationError = (error: unknown): error is Error => {
  return Boolean(
    error instanceof Error &&
    error.message === 'Connection terminated' &&
    error.stack?.includes('/node_modules/.pnpm/pg@')
  )
}

process.on('unhandledRejection', (error) => {
  if (isIgnorablePgTerminationError(error)) {
    if (!reportedPgTerminationRejection) {
      reportedPgTerminationRejection = true
      console.warn('[test-runner] Ignoring pg shutdown rejection during teardown')
    }
    return
  }

  throw normalizeThrownError(error)
})

process.on('uncaughtException', (error) => {
  if (isIgnorablePgTerminationError(error)) {
    if (!reportedPgTerminationRejection) {
      reportedPgTerminationRejection = true
      console.warn('[test-runner] Ignoring pg shutdown error during teardown')
    }
    return
  }

  throw normalizeThrownError(error)
})

const closeTestRuntimeConnections = async () => {
  const [{ default: db }, { default: redis }] = await Promise.all([
    import('@adonisjs/lucid/services/db'),
    import('@adonisjs/redis/services/main'),
  ])

  await Promise.allSettled([db.manager.closeAll(), redis.quit()])
}

const TEST_SERVER_HOST = '127.0.0.1'
const DEFAULT_TEST_SERVER_PORT = Number(process.env['TEST_SERVER_PORT'] ?? '3333')
const HAS_EXPLICIT_TEST_SERVER_PORT = process.env['TEST_SERVER_PORT'] !== undefined
const TEST_APP_GLOBAL_KEY = Symbol.for('suar.test.app')

const runWithFilteredJapaProcessListeners = async <T>(callback: () => Promise<T>): Promise<T> => {
  const originalProcessOn = process.on.bind(process)
  type ProcessOnEventName = Parameters<typeof process.on>[0]
  type ProcessOnListener = Parameters<typeof process.on>[1]

  process.on = ((eventName: ProcessOnEventName, listener: ProcessOnListener) => {
    if (eventName === 'unhandledRejection' || eventName === 'uncaughtException') {
      const wrappedListener = ((error: unknown, ...args: unknown[]) => {
        if (isIgnorablePgTerminationError(error)) {
          if (!reportedPgTerminationRejection) {
            reportedPgTerminationRejection = true
            console.warn('[test-runner] Ignoring pg shutdown rejection during teardown')
          }
          return
        }

        return (listener as (...listenerArgs: unknown[]) => unknown)(error, ...args)
      }) as ProcessOnListener

      return originalProcessOn(eventName, wrappedListener)
    }

    return originalProcessOn(eventName, listener)
  }) as typeof process.on

  try {
    return await callback()
  } finally {
    process.on = originalProcessOn
  }
}

try {
  const cliArgs = process.argv.slice(2)
  const requestedSuites = parseRequestedSuites(cliArgs)
  const shouldStartRuntimeProviders =
    requestedSuites === null ||
    requestedSuites.has('integration') ||
    requestedSuites.has('contract')
  let testServerPort = DEFAULT_TEST_SERVER_PORT
  const requestedTestServerPort = HAS_EXPLICIT_TEST_SERVER_PORT ? DEFAULT_TEST_SERVER_PORT : 0

  if (shouldStartRuntimeProviders) {
    applyTestDatastoreOverrides()
    await assertSafeTestDatastores()
  }

  const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })

  /**
   * Boot application and configure test environment
   */
  ignitor.tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => {
      void app.terminate()
    })
    app.listenIf(app.managedByPm2, 'SIGINT', () => void app.terminate())
  })

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()
  ;(globalThis as Record<PropertyKey, unknown>)[TEST_APP_GLOBAL_KEY] = app
  let runtimeStarted = false
  if (shouldStartRuntimeProviders) {
    await app.start(() => undefined)
    runtimeStarted = true
  }

  const server = await app.container.make('server')
  await server.boot()
  let nodeServer: ReturnType<typeof createServer> | null = null

  if (shouldStartRuntimeProviders) {
    nodeServer = createServer((req, res) => {
      void server.handle(req, res)
    })
    server.setNodeServer(nodeServer)
    const listeningServer = nodeServer

    await new Promise<void>((resolve, reject) => {
      listeningServer.once('error', reject)
      listeningServer.listen(requestedTestServerPort, TEST_SERVER_HOST, () => {
        listeningServer.off('error', reject)
        const address = listeningServer.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to resolve test server address'))
          return
        }

        testServerPort = address.port
        process.env['TEST_SERVER_PORT'] = String(testServerPort)
        process.env['PORT'] = String(testServerPort)
        process.env['HOST'] = TEST_SERVER_HOST
        process.env['APP_URL'] = `http://${TEST_SERVER_HOST}:${testServerPort}`
        resolve()
      })
    })
  }

  const routerService = await app.container.make('router')
  routerService.commit()
  const routerJson = routerService.toJSON()
  const rootRoutesCount = routerJson['root'] ? routerJson['root'].length : 0
  console.warn(
    'bin/test.ts router routes compiled: domains =',
    Object.keys(routerJson).length,
    'root routes =',
    rootRoutesCount
  )

  try {
    /**
     * Parse CLI args first so configure() can use them for suite filtering.
     * Example: --suites=unit will only run the unit suite.
     */
    processCLIArgs(process.argv.splice(2))

    /**
     * Configure test runner with 2 suites:
     *   - unit: Pure logic tests, no DB/network
     *   - integration: Tests that need DB/services
     *
     * Run all suites:   pnpm test:all
     * Run one suite:    pnpm test:unit | pnpm test:integration
     */
    configure({
      suites: [
        {
          name: 'unit',
          files: [...JAPA_SUITE_FILES.unit],
        },
        {
          name: 'integration',
          files: [...JAPA_SUITE_FILES.integration],
        },
        {
          name: 'contract',
          files: [...JAPA_SUITE_FILES.contract],
        },
      ],
      plugins: [
        assert(),
        fileSystem(),
        apiClient(`http://${TEST_SERVER_HOST}:${testServerPort}`),
        pluginAdonisJS(app),
        sessionApiClient(app),
        authApiClient(app),
      ],
      reporters: {
        activated: ['spec'],
        list: [
          {
            name: 'spec',
            handler: createSpecReporter,
          },
        ],
      },
      forceExit: true,
      importer: IMPORTER,
    })

    /**
     * Run tests
     */
    await runWithFilteredJapaProcessListeners(() => run())
  } finally {
    delete (globalThis as Record<PropertyKey, unknown>)[TEST_APP_GLOBAL_KEY]

    if (nodeServer) {
      const activeServer = nodeServer
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    }

    if (runtimeStarted) {
      await closeTestRuntimeConnections()
    }

    await app.terminate()
  }
} catch (error) {
  void prettyPrintError(error)
  process.exitCode = 1
}
