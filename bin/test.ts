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
  await ignitor.tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })

  const app = ignitor.createApp('console')
  await app.init()
  await app.boot()

  /**
   * Configure test runner
   */
  configure({
    files: ['app/**/*.spec.ts'],
    plugins: [assert(), fileSystem()],
    reporters: {
      activated: ['spec'],
      list: [specReporter()],
    },
    importer: IMPORTER,
  })

  /**
   * Run tests
   */
  processCLIArgs(process.argv.splice(2))
  await run()
} catch (error) {
  prettyPrintError(error)
  process.exitCode = 1
}
