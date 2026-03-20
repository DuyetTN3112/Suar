import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'
import { apiThrottle } from '#start/limiter'
import env from '#start/env'

// Lazy-loaded use-case controllers
const GetOrganizationMembersApiController = () =>
  import('#controllers/http/get_organization_members_api_controller')
const GetMeApiController = () => import('#controllers/http/get_me_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#controllers/http/get_users_in_organization_api_controller')
const DebugOrganizationInfoApiController = () =>
  import('#controllers/http/debug_organization_info_api_controller')

// Redis use-case controllers
const RedisListKeysController = () => import('#controllers/http/redis_list_keys_controller')
const RedisSetCacheController = () => import('#controllers/http/redis_set_cache_controller')
const RedisGetCacheController = () => import('#controllers/http/redis_get_cache_controller')
const RedisClearCacheController = () => import('#controllers/http/redis_clear_cache_controller')
const RedisFlushCacheController = () => import('#controllers/http/redis_flush_cache_controller')

const GetTaskAuditLogsController = () => import('#controllers/tasks/get_task_audit_logs_controller')

router
  .group(() => {
    // ─── Placeholder routes ───────────────────────────────────
    router.get('/search', ({ response }) => {
      response.json({ results: [] })
    })
    router.get('/modules/:id/posts', ({ response }) => {
      response.json({ posts: [] })
    })

    // ─── Task audit logs ──────────────────────────────────────
    router.get('/tasks/:id/audit-logs', [GetTaskAuditLogsController, 'handle'])

    // ─── Redis management (admin-only) ────────────────────────
    router
      .group(() => {
        router.get('/keys', [RedisListKeysController, 'handle'])
        router.post('/cache', [RedisSetCacheController, 'handle'])
        router.get('/cache/:key', [RedisGetCacheController, 'handle'])
        router.delete('/cache/:key', [RedisClearCacheController, 'handle'])
        router.delete('/cache', [RedisFlushCacheController, 'handle'])
      })
      .prefix('/redis')
      .use(middleware.authorizeRole(['superadmin', 'system_admin']))

    // ─── Organization & User APIs (Lucid Models) ──────────────
    router.get('/organization-members/:id', [GetOrganizationMembersApiController, 'handle'])
    router.get('/me', [GetMeApiController, 'handle'])
    router.get('/users-in-organization', [GetUsersInOrganizationApiController, 'handle'])

    // ─── Debug (DEV-only) ─────────────────────────────────────
    if (env.get('NODE_ENV') === 'development') {
      router.get('/debug-organization-info', [DebugOrganizationInfoApiController, 'handle'])
    }
  })
  .prefix('/api')
  .use([middleware.auth(), apiThrottle])
