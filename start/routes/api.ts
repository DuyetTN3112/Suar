import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import env from '#start/env'
import { apiThrottle } from '#start/limiter'

/**
 * API casing contract:
 * - public JSON request/response fields => camelCase
 * - legacy input aliases may accept snake_case only through compatibility normalization
 * - persistence / DB fields => snake_case
 * - route names stay lowercase dot-separated, multiword tokens use snake_case
 */

// Lazy-loaded use-case controllers
const GetOrganizationMembersApiController = () =>
  import('#modules/http/controllers/get_organization_members_api_controller')
const GetMeApiController = () => import('#modules/http/controllers/get_me_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/get_users_in_organization_api_controller')
const DebugOrganizationInfoApiController = () =>
  import('#modules/http/controllers/debug_organization_info_api_controller')
const ShowOrganizationApiController = () =>
  import('#modules/organizations/controllers/show_organization_api_controller')
const UpdateOrganizationApiController = () =>
  import('#modules/organizations/controllers/update_organization_api_controller')
const DeleteOrganizationApiController = () =>
  import('#modules/organizations/controllers/delete_organization_api_controller')

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
const SearchApiController = () => import('#modules/http/controllers/search_api_controller')
const SearchEventsApiController = () =>
  import('#modules/http/controllers/search_events_api_controller')
const UiEventsApiController = () =>
  import('#modules/http/controllers/ui_events_api_controller')

router
  .group(() => {
    // ─── Placeholder routes ───────────────────────────────────
    router
      .group(() => {
        router.get('/search', [SearchApiController, 'handle']).as('api.search.index')
        router
          .post('/search/events', [SearchEventsApiController, 'handle'])
          .as('api.search.events.store')
        router
          .post('/telemetry/ui-events', [UiEventsApiController, 'handle'])
          .as('api.telemetry.ui_events.store')
      })
      .use([middleware.bindHttpTransport('api-ops-internal')])

    // ─── Task audit logs ──────────────────────────────────────
    router
      .get('/tasks/:taskId/audit-logs', [GetTaskAuditLogsController, 'handle'])
      .as('api.tasks.audit_logs.index')

    // ─── Project APIs ─────────────────────────────────────────
    router
      .get('/projects/:projectId', [GetProjectDetailApiController, 'handle'])
      .as('api.projects.show')
    router
      .put('/projects/:projectId', [UpdateProjectApiController, 'handle'])
      .as('api.projects.replace')
    router
      .patch('/projects/:projectId', [UpdateProjectApiController, 'handle'])
      .as('api.projects.update')
    router
      .delete('/projects/:projectId', [DeleteProjectApiController, 'handle'])
      .as('api.projects.destroy')

    // ─── Redis management (admin-only) ────────────────────────
    router
      .group(() => {
        router.get('/keys', [RedisListKeysController, 'handle']).as('api.redis.keys.index')
        router.post('/cache', [RedisSetCacheController, 'handle']).as('api.redis.cache.store')
        router.get('/cache/:key', [RedisGetCacheController, 'handle']).as('api.redis.cache.show')
        router
          .delete('/cache/:key', [RedisClearCacheController, 'handle'])
          .as('api.redis.cache.destroy')
        router.delete('/cache', [RedisFlushCacheController, 'handle']).as('api.redis.cache.all.destroy')
      })
      .prefix('/redis')
      .use([
        middleware.bindHttpTransport('api-ops-internal'),
        middleware.authorizeRole(['superadmin', 'system_admin']),
      ])

    // ─── Organization & User APIs (Lucid Models) ──────────────
    router
      .get('/organizations/:organizationId', [ShowOrganizationApiController, 'handle'])
      .as('api.organizations.show')
    router
      .put('/organizations/:organizationId', [UpdateOrganizationApiController, 'handle'])
      .as('api.organizations.replace')
    router
      .patch('/organizations/:organizationId', [UpdateOrganizationApiController, 'handle'])
      .as('api.organizations.update')
    router
      .delete('/organizations/:organizationId', [DeleteOrganizationApiController, 'handle'])
      .as('api.organizations.destroy')
    router.get(
      '/organizations/:organizationId/members',
      [GetOrganizationMembersApiController, 'handle']
    ).as('api.organizations.members.index')
    router.get('/me', [GetMeApiController, 'handle']).as('api.me.show')
    router
      .get('/me/organizations/current/users', [GetUsersInOrganizationApiController, 'handle'])
      .as('api.organizations.users.index')

    // ─── Debug (DEV-only) ─────────────────────────────────────
    if (env.get('NODE_ENV') === 'development') {
      router
        .get('/dev/debug-organization-info', [DebugOrganizationInfoApiController, 'handle'])
        .as('api.dev.organizations.debug_info.show')
        .use([middleware.bindHttpTransport('api-ops-internal')])
    }
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    apiThrottle,
  ])
