import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'

@inject()
export default class DeleteNotificationController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async destroy(ctx: HttpContext) {
    await this.actions
      .makeDeleteNotification(actionContextFromHttp(ctx))
      .execute({ id: ctx.params['notificationId'] as string })

    ctx.response.noContent()
  }

  async destroyAllRead(ctx: HttpContext) {
    await this.actions.makeDeleteAllReadNotifications(actionContextFromHttp(ctx)).execute()

    ctx.response.noContent()
  }
}
