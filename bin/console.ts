/*
|--------------------------------------------------------------------------
| Ace entry point
|--------------------------------------------------------------------------
|
| The "console.ts" file is the entrypoint for booting the AdonisJS
| command-line framework and executing commands.
|
| Commands do not boot the application, unless the currently running command
| has "options.startApp" flag set to true.
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(() => {
      // Wrap async function để không return Promise
      void import('#start/env')
    })
    app.listen('SIGTERM', () => {
      // Wrap async function để không return Promise
      void app.terminate()
    })
    app.listenIf(app.managedByPm2, 'SIGINT', () => {
      // Wrap async function để không return Promise
      void app.terminate()
    })
  })
  .ace()
  .handle(process.argv.splice(2))
  .catch((error: Error) => {
    process.exitCode = 1
    void prettyPrintError(error)
  })
