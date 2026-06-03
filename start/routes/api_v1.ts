import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { apiThrottle } from '#start/limiter'

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

// Read-only routes — any authenticated user
router
  .group(() => {
    router.get('/me', [ShowMeController, 'handle']).as('me.show')
    router.get('/me/settings', [ShowSettingsController, 'handle']).as('me.settings.show')
    router.patch('/me/settings', [UpdateSettingsController, 'handle']).as('me.settings.update')

    router.get('/notifications', [ListNotificationsController, 'handle']).as('notifications.index')
    router
      .post('/notifications/read-all', [MarkNotificationReadController, 'markAll'])
      .as('notifications.read_all')
    router
      .post('/notifications/:notificationId/read', [MarkNotificationReadController, 'markOne'])
      .as('notifications.read')
    router
      .delete('/notifications/read', [DeleteNotificationController, 'destroyAllRead'])
      .as('notifications.destroy_read')
    router
      .delete('/notifications/:notificationId', [DeleteNotificationController, 'destroy'])
      .as('notifications.destroy')

    router.get('/task-statuses', [ListTaskStatusesController, 'handle']).as('task_statuses.index')
    router
      .get('/task-statuses/:taskStatusId', [ShowTaskStatusController, 'handle'])
      .as('task_statuses.show')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([middleware.auth(), middleware.requireOrg(), apiThrottle])

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
  })
  .prefix('/api/v1')
  .use([middleware.auth(), middleware.requireOrg(), middleware.requireOrgAdmin(), apiThrottle])
