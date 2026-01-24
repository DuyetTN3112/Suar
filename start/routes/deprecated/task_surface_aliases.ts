import router from '@adonisjs/core/services/router'

import { middleware } from '../../kernel.js'

import { throttle } from '#start/limiter'

const CheckCreatePermissionController = () =>
  import('#modules/tasks/controllers/check_create_permission_controller')
const ListTasksGroupedController = () =>
  import('#modules/tasks/controllers/list_tasks_grouped_controller')
const ListTasksTimelineController = () =>
  import('#modules/tasks/controllers/list_tasks_timeline_controller')
const PrefillTaskRequirementsFromRoleController = () =>
  import('#modules/tasks/controllers/v1/prefill_task_requirements_from_role_controller')

/**
 * Deprecated helper-style task aliases isolated from primary task route files
 * so canonical noun-based task surfaces are the first thing humans see.
 */

router
  .group(() => {
    router
      .get('/tasks/check-create-permission', [CheckCreatePermissionController, 'handle'])
      .as('api.tasks.creation_access.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/tasks/creation-access',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/tasks/grouped', [ListTasksGroupedController, 'handle'])
      .as('api.tasks.status_groups.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/tasks/status-groups',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/tasks/timeline', [ListTasksTimelineController, 'handle'])
      .as('api.tasks.timeline_items.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/tasks/timeline-items',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/tasks/check-create-permission', [CheckCreatePermissionController, 'handle'])
      .as('api.v1.tasks.creation_access.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/tasks/creation-access',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/tasks/grouped', [ListTasksGroupedController, 'handle'])
      .as('api.v1.tasks.status_groups.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/tasks/status-groups',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/tasks/timeline', [ListTasksTimelineController, 'handle'])
      .as('api.v1.tasks.timeline_items.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/tasks/timeline-items',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .post('/prefill-from-role', [PrefillTaskRequirementsFromRoleController, 'handle'])
      .as('api.v1.tasks.requirements.role_prefill.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/tasks/:taskId/requirements/role-prefill',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1/tasks/:taskId/requirements')
  .use([
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.bindHttpTransport('api-canonical'),
  ])
