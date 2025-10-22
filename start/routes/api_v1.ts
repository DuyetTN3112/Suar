import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { apiThrottle } from '#start/limiter'

/**
 * Canonical v1 casing contract:
 * - public JSON request/response fields => camelCase
 * - persistence / DB fields => snake_case
 * - route names stay lowercase dot-separated, multiword tokens use snake_case
 */

const ShowMeController = () => import('#modules/http/controllers/v1/show_me_controller')

const ShowSettingsController = () => import('#modules/settings/controllers/v1/show_settings_controller')
const UpdateSettingsController = () =>
  import('#modules/settings/controllers/v1/update_settings_controller')

const ListNotificationsController = () =>
  import('#modules/notifications/controllers/v1/list_notifications_controller')
const MarkNotificationReadController = () =>
  import('#modules/notifications/controllers/v1/mark_notification_read_controller')
const DeleteNotificationController = () =>
  import('#modules/notifications/controllers/v1/delete_notification_controller')

const ListTaskStatusesController = () =>
  import('#modules/tasks/controllers/v1/list_task_statuses_controller')
const ShowTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/show_task_status_controller')
const CreateTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/create_task_status_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/update_task_status_controller')
const DeleteTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/delete_task_status_controller')
const ListWorkflowController = () =>
  import('#modules/tasks/controllers/v1/list_workflow_controller')
const ReplaceTaskWorkflowTransitionsV1Controller = () =>
  import('#modules/tasks/controllers/v1/replace_task_workflow_transitions_controller')
const GetProjectDetailApiController = () =>
  import('#modules/projects/controllers/get_project_detail_api_controller')
const UpdateProjectApiController = () =>
  import('#modules/projects/controllers/update_project_api_controller')
const DeleteProjectApiController = () =>
  import('#modules/projects/controllers/delete_project_api_controller')
const ShowOrganizationApiController = () =>
  import('#modules/organizations/controllers/show_organization_api_controller')
const UpdateOrganizationApiController = () =>
  import('#modules/organizations/controllers/update_organization_api_controller')
const DeleteOrganizationApiController = () =>
  import('#modules/organizations/controllers/delete_organization_api_controller')
const GetOrganizationMembersApiController = () =>
  import('#modules/http/controllers/get_organization_members_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/get_users_in_organization_api_controller')

// Read-only routes — any authenticated user
router
  .group(() => {
    router.get('/me', [ShowMeController, 'handle']).as('me.show')
    router.get('/me/settings', [ShowSettingsController, 'handle']).as('me.settings.show')
    router.patch('/me/settings', [UpdateSettingsController, 'handle']).as('me.settings.update')

    router.get('/notifications', [ListNotificationsController, 'handle']).as('notifications.index')
    router
      .post('/notifications/read-all', [MarkNotificationReadController, 'markAll'])
      .as('notifications.read_statuses.update')
    router
      .post('/notifications/:notificationId/read', [MarkNotificationReadController, 'markOne'])
      .as('notifications.read_status.update')
    router
      .delete('/notifications/read', [DeleteNotificationController, 'destroyAllRead'])
      .as('notifications.read_notifications.destroy')
    router
      .delete('/notifications/:notificationId', [DeleteNotificationController, 'destroy'])
      .as('notifications.destroy')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    apiThrottle,
  ])

// Org-scoped read routes
router
  .group(() => {
    router.get('/task-statuses', [ListTaskStatusesController, 'handle']).as('task_statuses.index')
    router
      .get('/task-statuses/:taskStatusId', [ShowTaskStatusController, 'handle'])
      .as('task_statuses.show')
    router
      .get('/workflow', [ListWorkflowController, 'handle'])
      .as('task_statuses.workflow.index')
    router
      .get('/projects/:projectId', [GetProjectDetailApiController, 'handle'])
      .as('projects.show')
    router
      .get('/organizations/:organizationId', [ShowOrganizationApiController, 'handle'])
      .as('organizations.show')
    router
      .get('/organizations/:organizationId/members', [GetOrganizationMembersApiController, 'handle'])
      .as('organizations.members.index')
    router
      .get('/me/organizations/current/users', [GetUsersInOrganizationApiController, 'handle'])
      .as('organizations.users.index')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])

// Mutation routes — admin/owner only
router
  .group(() => {
    router
      .post('/task-statuses', [CreateTaskStatusController, 'handle'])
      .as('task_statuses.store')
    router
      .patch('/task-statuses/:taskStatusId', [UpdateTaskStatusController, 'handle'])
      .as('task_statuses.update')
    router
      .delete('/task-statuses/:taskStatusId', [DeleteTaskStatusController, 'handle'])
      .as('task_statuses.destroy')
    router
      .put('/workflow', [ReplaceTaskWorkflowTransitionsV1Controller, 'handle'])
      .as('task_statuses.workflow.update')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    apiThrottle,
  ])

router
  .group(() => {
    router
      .patch('/projects/:projectId', [UpdateProjectApiController, 'handle'])
      .as('projects.update')
    router
      .delete('/projects/:projectId', [DeleteProjectApiController, 'handle'])
      .as('projects.destroy')
    router
      .patch('/organizations/:organizationId', [UpdateOrganizationApiController, 'handle'])
      .as('organizations.update')
    router
      .delete('/organizations/:organizationId', [DeleteOrganizationApiController, 'handle'])
      .as('organizations.destroy')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])
