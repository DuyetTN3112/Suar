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
server.errorHandler(() => import('#modules/http/exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#modules/http/middleware/request_context_middleware'),
  () => import('#modules/http/middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('#modules/http/middleware/lang_static_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('#modules/http/middleware/inertia_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 *
 * Thứ tự: session → auth init → shield → bodyparser → org resolver → locale
 * Đã xóa: memory_monitor (dead code, gọi global.gc() nguy hiểm)
 * Đã gộp: current_organization_middleware → organization_resolver_middleware
 */
router.use([
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('#modules/organizations/access/middleware/organization_resolver_middleware'),
  () => import('#modules/http/middleware/detect_user_locale_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 *
 * Đã xóa: silentAuth (empty implementation, dead code)
 * Đã thêm: auditLog (middleware ghi nhật ký)
 * Đã giữ: guest, auth, cache, authorizeRole, requireOrg
 *
 * NEW: Admin/Org separation middleware
 * - requireSystemAdmin: System admin access only (superadmin/system_admin)
 * - systemAdminContext: Set system admin context
 * - requireOrgAdmin: Org admin/owner access only
 * - requireOrgOwner: Org owner access only (stricter)
 * - orgAdminContext: Set organization admin context
 *
 * Note: requireOrg giờ chỉ là alias backup — OrganizationResolver
 * đã chạy trong router.use() global. Giữ lại cho routes cần strict check.
 */
export const middleware = router.named({
  guest: () => import('#modules/auth/middleware/guest_middleware'),
  auth: () => import('#modules/auth/middleware/auth_middleware'),
  bindApiAuthContract: () => import('#modules/auth/middleware/bind_api_auth_contract_middleware'),
  cache: () => import('#modules/http/middleware/cache_middleware'),
  opsApiKey: () => import('#modules/http/middleware/api_key_middleware'),
  metricsApiKey: () => import('#modules/http/middleware/metrics_api_key_middleware'),
  cacheAdminAccess: () => import('#modules/http/middleware/cache_admin_access_middleware'),
  bindHttpTransport: () => import('#modules/http/middleware/bind_http_transport_middleware'),
  markDeprecatedRoute: () => import('#modules/http/middleware/mark_deprecated_route_middleware'),
  authorizeRole: () => import('#modules/authorization/middleware/authorize_role'),
  requireOrg: () => import('#modules/organizations/access/middleware/require_organization_middleware'),
  requireProjectWorkspace: () =>
    import('#modules/projects/middleware/require_project_workspace_access_middleware'),
  auditLog: () => import('#modules/audit/middleware/audit_log_middleware'),
  // System Admin middleware
  requireSystemAdmin: () =>
    import('#modules/authorization/middleware/require_system_admin_middleware'),
  systemAdminContext: () =>
    import('#modules/authorization/middleware/system_admin_context_middleware'),
  // Organization Admin middleware
  requireOrgAdmin: () => import('#modules/organizations/access/middleware/require_org_admin_middleware'),
  requireOrgPermission: () =>
    import('#modules/organizations/access/middleware/require_org_permission_middleware'),
  requireOrgOwner: () => import('#modules/organizations/access/middleware/require_org_owner_middleware'),
  orgAdminContext: () =>
    import('#modules/organizations/access/middleware/organization_admin_context_middleware'),
})
