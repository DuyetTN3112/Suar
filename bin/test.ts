import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { configure, processCLIArgs, run } from '@japa/runner'
import { assert } from '@japa/assert'
import { specReporter } from '@japa/spec-reporter'
import { fileSystem } from '@japa/file-system'

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

try {
  const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })

  /**
   * Boot application and configure test environment
   */
  ignitor.tap((app) => {
    app.booting(() => {
      void import('#start/env')
    })
    app.listen('SIGTERM', () => void app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => void app.terminate())
  })

  const app = ignitor.createApp('console')
  await app.init()
  await app.boot()

  await app.start(async () => {
    /**
     * Parse CLI args first so configure() can use them for suite filtering.
     * Example: --suites=unit will only run the unit suite.
     */
    processCLIArgs(process.argv.splice(2))

    /**
     * Configure test runner with 3 suites:
     *   - unit: Pure logic tests, no DB/network
     *   - integration: Tests that need DB/services
     *   - match: Pattern matching / snapshot tests
     *
     * Run all:          pnpm test
     * Run one suite:    pnpm test:unit | pnpm test:integration | pnpm test:match
     */
    configure({
      suites: [
        {
          name: 'unit',
          files: ['tests/unit/**/*.spec.ts'],
        },
        {
          name: 'integration',
          files: ['tests/integration/**/*.spec.ts'],
        },
        {
          name: 'match',
          files: ['tests/match/**/*.spec.ts'],
        },
      ],
      plugins: [assert(), fileSystem()],
      reporters: {
        activated: ['spec'],
        list: [
          {
            name: 'spec',
            handler: specReporter(),
          },
        ],
      },
      forceExit: true,
      importer: IMPORTER,
    })

    /**
     * Run tests
     */
    await run()
  })
} catch (error) {
  void prettyPrintError(error as Error)
  process.exitCode = 1
}
