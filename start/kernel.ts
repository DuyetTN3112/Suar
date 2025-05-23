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
import { DateTime, Settings } from 'luxon'
import env from './env.js'

/**
 * Cấu hình múi giờ toàn cục cho ứng dụng (Việt Nam - UTC+7)
 */
Settings.defaultZone = env.get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh')
Settings.defaultLocale = env.get('APP_LOCALE', 'vi-VN')
console.log('Timezone configured:', Settings.defaultZone)
console.log('Current DateTime:', DateTime.now().toISO())

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
})
