import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'

@inject()
export default class MarkNotificationReadController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async markOne(ctx: HttpContext) {
    await this.actions
      .makeMarkNotificationAsRead(actionContextFromHttp(ctx))
      .execute({ id: ctx.params['notificationId'] as string })

    ctx.response.noContent()
  }

  async markAll(ctx: HttpContext) {
    await this.actions.makeMarkAllNotificationsAsRead(actionContextFromHttp(ctx)).execute()

    ctx.response.noContent()
  }
}
