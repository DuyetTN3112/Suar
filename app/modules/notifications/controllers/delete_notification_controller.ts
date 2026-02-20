import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteNotification from '#modules/notifications/actions/delete_notification'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
      await deleteNotification.handle({ id: params.id as string })
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    try {
      const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
      await deleteNotification.deleteAllRead()
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }
}
