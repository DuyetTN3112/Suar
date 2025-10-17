import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import DeleteNotification from '#modules/notifications/actions/delete_notification'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
    await deleteNotification.handle({ id: params['notificationId'] as string })
    response.noContent()
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
    await deleteNotification.deleteAllRead()
    response.noContent()
  }
}
