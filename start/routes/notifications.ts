import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Notifications controllers
const NotificationsController = () => import('#controllers/notifications/notifications_controller')

router
  .group(() => {
    // Notifications routes
    router.get('/notifications', [NotificationsController, 'index']).as('notifications.index')
    // Route này trả về các thông báo mới nhất và số lượng thông báo chưa đọc
    router
      .get('/notifications/latest', [NotificationsController, 'latest'])
      .as('notifications.latest')
    router
      .post('/notifications/:id/mark-as-read', [NotificationsController, 'markAsRead'])
      .as('notifications.mark_as_read')
    router
      .post('/notifications/mark-all-as-read', [NotificationsController, 'markAllAsRead'])
      .as('notifications.mark_all_as_read')
    router
      .delete('/notifications/:id', [NotificationsController, 'destroy'])
      .as('notifications.destroy')
    router
      .delete('/notifications', [NotificationsController, 'destroyAllRead'])
      .as('notifications.destroy_all_read')
  })
  .use(middleware.auth())
