/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| File server.ts là điểm vào để khởi động HTTP server của AdonisJS.
| Bạn có thể chạy file này trực tiếp hoặc sử dụng lệnh "serve"
| để chạy và theo dõi các thay đổi của file.
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL đến thư mục gốc của ứng dụng
 */
const APP_ROOT = new URL('./', import.meta.url)

/**
 * Hàm importer được sử dụng để import các file trong ngữ cảnh của ứng dụng
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
      void import('#start/env')
    })
    app.listen('SIGTERM', () => void app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => void app.terminate())
  })
  .httpServer()
  .start()
  .catch((error = Error) => {
    process.exitCode = 1
    void prettyPrintError(error)
  })
