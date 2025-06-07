import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteNotification from '#actions/notifications/delete_notification'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const deleteNotification = new DeleteNotification(ExecutionContext.fromHttp(ctx))
      await deleteNotification.handle({ id: params.id as string })
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    try {
      const deleteNotification = new DeleteNotification(ExecutionContext.fromHttp(ctx))
      await deleteNotification.deleteAllRead()
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }
}
