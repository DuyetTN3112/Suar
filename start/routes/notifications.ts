import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ListNotificationsController = () =>
  import('#modules/notifications/controllers/list_notifications_controller')
const LatestNotificationsController = () =>
  import('#modules/notifications/controllers/latest_notifications_controller')
const MarkNotificationReadController = () =>
  import('#modules/notifications/controllers/mark_notification_read_controller')
const DeleteNotificationController = () =>
  import('#modules/notifications/controllers/delete_notification_controller')

router
  .group(() => {
    // Notifications routes
    router.get('/notifications', [ListNotificationsController, 'handle']).as('notifications.index')
    router
      .get('/notifications/latest', [LatestNotificationsController, 'handle'])
      .as('notifications.latest')
    router
      .post('/notifications/:id/mark-as-read', [MarkNotificationReadController, 'markOne'])
      .as('notifications.mark_as_read')
    router
      .post('/notifications/mark-all-as-read', [MarkNotificationReadController, 'markAll'])
      .as('notifications.mark_all_as_read')
    router
      .delete('/notifications/:id', [DeleteNotificationController, 'destroy'])
      .as('notifications.destroy')
    router
      .delete('/notifications', [DeleteNotificationController, 'destroyAllRead'])
      .as('notifications.destroy_all_read')
  })
  .use([middleware.auth(), throttle])
