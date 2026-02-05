import type { HttpContext } from '@adonisjs/core/http'

import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { ExecutionContext } from '#types/execution_context'
import { PAGINATION } from '#types/pagination'

const LATEST_NOTIFICATIONS_DEFAULT_LIMIT = 10

/**
 * GET /notifications/latest → Get latest notifications (JSON API)
 */
export default class LatestNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(ExecutionContext.fromHttpOptional(ctx))
      const limit = Number(request.input('limit', LATEST_NOTIFICATIONS_DEFAULT_LIMIT))
      const result = await getUserNotifications.handle({
        page: PAGINATION.DEFAULT_PAGE,
        limit,
        unread_only: false,
      })
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
