/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'
import {
  // DateTime,
  Settings,
} from 'luxon'
import env from './env.js'

/**
 * Cấu hình múi giờ toàn cục cho ứng dụng (Việt Nam - UTC+7)
 */
Settings.defaultZone = env.get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh')
Settings.defaultLocale = env.get('APP_LOCALE', 'vi-VN')

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('#middleware/lang_static_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('@adonisjs/inertia/inertia_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 *
 * Thứ tự tương tự như trong dự án WebAdonis
 */
router.use([
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('#middleware/memory_monitor'),
  () => import('#middleware/current_organization_middleware'),
  () => import('#middleware/detect_user_locale_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
  silentAuth: () => import('#middleware/silent_auth_middleware'),
  cache: () => import('#middleware/cache_middleware'),
  authorizeRole: () => import('#middleware/authorize_role'),
  requireOrg: () => import('#middleware/require_organization_middleware'),
  messageSanitizer: () => import('#middleware/message_sanitizer'),
})

/**
 * Graceful Shutdown Handlers
 *
 * Đảm bảo cleanup resources (Redis, Database) khi:
 * - Server shutdown (SIGTERM, SIGINT)
 * - Hot reload (SIGUSR2)
 * - HMR (import.meta.hot.dispose)
 *
 * Pattern: Hybrid CQRS with Manual Resolution
 * Mục đích: Tránh stale connections gây "Cannot inject" errors
 */

let isShuttingDown = false

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`)

  try {
    // Import services dynamically để tránh circular deps
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const { default: db } = await import('@adonisjs/lucid/services/db')

    // Close Redis connections
    console.log('📦 Closing Redis connections...')
    await redis.quit()

    // Close Database connections
    console.log('🗄️  Closing database connections...')
    await db.manager.closeAll()

    console.log('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error)
    process.exit(1)
  }
}

// SIGTERM: Kubernetes, Docker, systemd (graceful termination)
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})

// SIGINT: Ctrl+C in terminal
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})

// SIGUSR2: nodemon restart (hot reload)
process.on('SIGUSR2', () => {
  void (async () => {
    console.log('\n🔥 Hot reload detected (SIGUSR2), cleaning up...')
    try {
      const { default: redis } = await import('@adonisjs/redis/services/main')
      const { default: db } = await import('@adonisjs/lucid/services/db')

      await redis.quit()
      await db.manager.closeAll()

      console.log('✅ Cleanup completed, restarting...')
      process.kill(process.pid, 'SIGUSR2')
    } catch (error) {
      console.error('❌ Error during hot reload cleanup:', error)
    }
  })()
})

/**
 * HMR (Hot Module Replacement) Cleanup
 * Vite HMR - cleanup khi module được hot-replaced
 */
// @ts-expect-error - import.meta.hot is provided by Vite in dev mode
if (import.meta.hot) {
  // @ts-expect-error - import.meta.hot.dispose is provided by Vite
  import.meta.hot.dispose(() => {
    void (async () => {
      console.log('🔥 HMR: Disposing kernel module...')
      try {
        const { default: redis } = await import('@adonisjs/redis/services/main')
        const { default: db } = await import('@adonisjs/lucid/services/db')

        await redis.quit()
        await db.manager.closeAll()

        console.log('✅ HMR cleanup completed')
      } catch (error) {
        console.error('❌ Error during HMR cleanup:', error)
      }
    })()
  })
}
