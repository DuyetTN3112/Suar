import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import { serializeNotifications } from '#actions/notifications/serializers/notification_serializer'
import { PAGINATION } from '#constants/common_constants'

const NOTIFICATIONS_DEFAULT_LIMIT = 15

/**
 * GET /notifications → List notifications (Inertia page)
 */
export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(ExecutionContext.fromHttpOptional(ctx))
      const page = Number(request.input('page', PAGINATION.DEFAULT_PAGE))
      const limit = Number(request.input('limit', NOTIFICATIONS_DEFAULT_LIMIT))
      const unreadOnly = request.input('unread_only') === 'true'
      const result = await getUserNotifications.handle({ page, limit, unread_only: unreadOnly })
      return await inertia.render('notifications/index', {
        notifications: {
          data: serializeNotifications(result.notifications),
          meta: result.meta,
        },
        unread_count: result.unread_count,
        filters: { page, limit, unread_only: unreadOnly },
      })
    } catch {
      // Gracefully handle missing notifications table or other DB errors
      return await inertia.render('notifications/index', {
        notifications: {
          data: [],
          meta: {
            total: 0,
            per_page: NOTIFICATIONS_DEFAULT_LIMIT,
            current_page: PAGINATION.DEFAULT_PAGE,
            last_page: 1,
          },
        },
        unread_count: 0,
        filters: {
          page: PAGINATION.DEFAULT_PAGE,
          limit: NOTIFICATIONS_DEFAULT_LIMIT,
          unread_only: false,
        },
      })
    }
  }
}
