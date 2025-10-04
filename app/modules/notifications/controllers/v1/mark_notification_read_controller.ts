import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import MarkNotificationAsRead from '#modules/notifications/actions/mark_notification_as_read'

export default class MarkNotificationReadController {
  async markOne(ctx: HttpContext) {
    await new MarkNotificationAsRead(actionContextFromHttp(ctx)).handle({
      id: ctx.params['notificationId'] as string,
    })

    ctx.response.noContent()
  }

  async markAll(ctx: HttpContext) {
    await new MarkNotificationAsRead(actionContextFromHttp(ctx)).markAllAsRead()

    ctx.response.noContent()
  }
}
