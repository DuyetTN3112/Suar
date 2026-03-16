import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserNotifications from '#actions/notifications/get_user_notifications'

/**
 * GET /notifications → List notifications (Inertia page)
 */
export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    const getUserNotifications = new GetUserNotifications(ExecutionContext.fromHttpOptional(ctx))
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 15))
    const unreadOnly = request.input('unread_only') === 'true'
    const result = await getUserNotifications.handle({ page, limit, unread_only: unreadOnly })
    return await inertia.render('notifications/index', {
      notifications: result.notifications,
      unread_count: result.unread_count,
      filters: { page, limit, unread_only: unreadOnly },
    })
  }
}
