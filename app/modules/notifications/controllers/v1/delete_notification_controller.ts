import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteNotification from '#modules/notifications/actions/delete_notification'

export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    await new DeleteNotification(actionContextFromHttp(ctx)).handle({
      id: ctx.params.notificationId as string,
    })

    ctx.response.noContent()
  }

  async destroyAllRead(ctx: HttpContext) {
    await new DeleteNotification(actionContextFromHttp(ctx)).deleteAllRead()

    ctx.response.noContent()
  }
}
