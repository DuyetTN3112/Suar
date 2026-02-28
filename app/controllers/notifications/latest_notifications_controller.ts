import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import { serializeNotifications } from '#actions/notifications/serializers/notification_serializer'
import loggerService from '#services/logger_service'

/**
 * GET /notifications/latest → Get latest notifications (JSON API)
 */
export default class LatestNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const getUserNotifications = new GetUserNotifications(ExecutionContext.fromHttpOptional(ctx))
    const limit = Number(request.input('limit', 10))
    try {
      const result = await getUserNotifications.handle({ page: 1, limit, unread_only: false })
      const jsonResult = result.notifications.toJSON()
      const notificationsData = serializeNotifications(jsonResult.data as any[])

      response.json({
        notifications: notificationsData,
        unread_count: result.unread_count,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải thông báo'
      loggerService.error('Error in latest notifications:', error)
      response.status(500).json({ error: errorMessage })
      return
    }
  }
}
