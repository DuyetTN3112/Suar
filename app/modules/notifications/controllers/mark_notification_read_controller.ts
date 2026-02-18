import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import MarkNotificationAsRead from '#modules/notifications/actions/mark_notification_as_read'

/**
 * POST /notifications/:id/mark-as-read → Mark single notification as read
 * POST /notifications/mark-all-as-read → Mark all notifications as read
 */
export default class MarkNotificationReadController {
  async markOne(ctx: HttpContext) {
    const { params, response } = ctx
    const markAsRead = new MarkNotificationAsRead(actionContextFromHttp(ctx))
    await markAsRead.handle({ id: params['notificationId'] as string })
    response.noContent()
  }

  async markAll(ctx: HttpContext) {
    const { response } = ctx
    const markAsRead = new MarkNotificationAsRead(actionContextFromHttp(ctx))
    await markAsRead.markAllAsRead()
    response.noContent()
  }
}
