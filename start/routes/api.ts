import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import env from '#start/env'
import { apiThrottle } from '#start/limiter'

// Lazy-loaded use-case controllers
const GetOrganizationMembersApiController = () =>
  import('#modules/http/controllers/get_organization_members_api_controller')
const GetMeApiController = () => import('#modules/http/controllers/get_me_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/get_users_in_organization_api_controller')
const DebugOrganizationInfoApiController = () =>
  import('#modules/http/controllers/debug_organization_info_api_controller')

// Redis use-case controllers
const RedisListKeysController = () => import('#modules/http/controllers/redis_list_keys_controller')
const RedisSetCacheController = () => import('#modules/http/controllers/redis_set_cache_controller')
const RedisGetCacheController = () => import('#modules/http/controllers/redis_get_cache_controller')
const RedisClearCacheController = () =>
  import('#modules/http/controllers/redis_clear_cache_controller')
const RedisFlushCacheController = () =>
  import('#modules/http/controllers/redis_flush_cache_controller')

const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/get_task_audit_logs_controller')

// Project API controllers
const GetProjectDetailApiController = () =>
  import('#modules/projects/controllers/get_project_detail_api_controller')
const UpdateProjectApiController = () =>
  import('#modules/projects/controllers/update_project_api_controller')
const DeleteProjectApiController = () =>
  import('#modules/projects/controllers/delete_project_api_controller')

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

    // ─── Project APIs ─────────────────────────────────────────
    router.get('/projects/:id', [GetProjectDetailApiController, 'handle']).as('api.projects.show')
    router.put('/projects/:id', [UpdateProjectApiController, 'handle']).as('api.projects.update')
    router
      .delete('/projects/:id', [DeleteProjectApiController, 'handle'])
      .as('api.projects.destroy')

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
