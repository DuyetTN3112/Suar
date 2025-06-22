import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import { serializeNotifications } from '#actions/notifications/serializers/notification_serializer'

/**
 * GET /notifications/latest → Get latest notifications (JSON API)
 */
export default class LatestNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(ExecutionContext.fromHttpOptional(ctx))
      const limit = Number(request.input('limit', 10))
      const result = await getUserNotifications.handle({ page: 1, limit, unread_only: false })
      const notificationsData = serializeNotifications(result.notifications)

      response.json({
        notifications: notificationsData,
        unread_count: result.unread_count,
      })
    } catch {
      // Gracefully handle missing notifications table or other DB errors
      response.json({
        notifications: [],
        unread_count: 0,
      })
    }
  }
}
