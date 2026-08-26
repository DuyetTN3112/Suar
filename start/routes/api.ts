import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import {
  shouldExposeCacheValueDiagnostics,
  shouldRegisterCacheAdminRoutes,
} from '#modules/http/middleware/cache_admin_access_middleware'
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
  import('#modules/http/controllers/organization/get_organization_members_api_controller')
const GetMeApiController = () => import('#modules/http/controllers/identity/get_me_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/organization/get_users_in_organization_api_controller')
const DebugOrganizationInfoApiController = () =>
  import('#modules/http/controllers/organization/debug_organization_info_api_controller')
const ShowOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/show_organization_api_controller')
const UpdateOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/update_organization_api_controller')
const DeleteOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/delete_organization_api_controller')

// Redis use-case controllers
const RedisListKeysController = () => import('#modules/http/controllers/cache/redis_list_keys_controller')
const RedisSetCacheController = () => import('#modules/http/controllers/cache/redis_set_cache_controller')
const RedisGetCacheController = () => import('#modules/http/controllers/cache/redis_get_cache_controller')
const RedisClearCacheController = () =>
  import('#modules/http/controllers/cache/redis_clear_cache_controller')
const RedisFlushCacheController = () =>
  import('#modules/http/controllers/cache/redis_flush_cache_controller')

const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/task-reading/get_task_audit_logs_controller')

// Project API controllers
const GetProjectDetailApiController = () =>
  import('#modules/projects/controllers/project-context/get_project_detail_api_controller')
const UpdateProjectApiController = () =>
  import('#modules/projects/controllers/project-context/update_project_api_controller')
const DeleteProjectApiController = () =>
  import('#modules/projects/controllers/project-context/delete_project_api_controller')
const SearchApiController = () => import('#modules/http/controllers/search-discovery/search_api_controller')
const SearchDiscoveryApiController = () =>
  import('#modules/http/controllers/search-discovery/search_discovery_api_controller')
const SearchEventsApiController = () =>
  import('#modules/http/controllers/search-discovery/search_events_api_controller')
const UiEventsApiController = () => import('#modules/http/controllers/search-discovery/ui_events_api_controller')

// Redis control-plane routes use their own transport contract. Keeping this
// group outside the compatibility API group prevents nested transport binding
// conflicts while retaining the same auth, throttling, and break-glass guards.
if (
  shouldRegisterCacheAdminRoutes(env.get('NODE_ENV'), env.get('CACHE_ADMIN_API_ENABLED', false))
) {
  router
    .group(() => {
      if (shouldExposeCacheValueDiagnostics(env.get('NODE_ENV'))) {
        router.get('/keys', [RedisListKeysController, 'handle']).as('api.redis.keys.index')
        router.post('/cache', [RedisSetCacheController, 'handle']).as('api.redis.cache.store')
        router
          .get('/cache/:key', [RedisGetCacheController, 'handle'])
          .as('api.redis.cache.show')
      }
      router
        .delete('/cache/:key', [RedisClearCacheController, 'handle'])
        .as('api.redis.cache.destroy')
      router
        .delete('/cache', [RedisFlushCacheController, 'handle'])
        .as('api.redis.cache.all.destroy')
    })
    .prefix('/api/redis')
    .use([
      middleware.bindHttpTransport('api-ops-internal'),
      middleware.bindApiAuthContract('session-or-bearer'),
      middleware.auth(),
      apiThrottle,
      middleware.cacheAdminAccess(),
    ])
}

router
  .group(() => {
    // ─── Placeholder routes ───────────────────────────────────
    router
      .group(() => {
        router.get('/search', [SearchApiController, 'handle']).as('api.search.index')
        router
          .post('/search/query', [SearchDiscoveryApiController, 'handle'])
          .as('api.search.query.compat')
        router
          .post('/search/events', [SearchEventsApiController, 'handle'])
          .as('api.search.events.store')
        router
          .post('/telemetry/ui-events', [UiEventsApiController, 'handle'])
          .as('api.telemetry.ui_events.store')
      })

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
    router
      .get('/organizations/:organizationId/members', [
        GetOrganizationMembersApiController,
        'handle',
      ])
      .as('api.organizations.members.index')
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
