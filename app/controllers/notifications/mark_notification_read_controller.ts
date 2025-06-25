import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'

/**
 * POST /notifications/:id/mark-as-read → Mark single notification as read
 * POST /notifications/mark-all-as-read → Mark all notifications as read
 */
export default class MarkNotificationReadController {
  async markOne(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(ExecutionContext.fromHttp(ctx))
      await markAsRead.handle({ id: params.id as string })
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }

  async markAll(ctx: HttpContext) {
    const { response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(ExecutionContext.fromHttp(ctx))
      await markAsRead.markAllAsRead()
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }
}
