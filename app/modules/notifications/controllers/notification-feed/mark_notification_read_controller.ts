import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'

/**
 * POST /notifications/:id/mark-as-read → Mark single notification as read
 * POST /notifications/mark-all-as-read → Mark all notifications as read
 */
@inject()
export default class MarkNotificationReadController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async markOne(ctx: HttpContext) {
    const { params, response } = ctx
    await this.actions
      .makeMarkNotificationAsRead(actionContextFromHttp(ctx))
      .executeAndWrap({ id: params['notificationId'] as string })
      .then((outcome) => outcome.getValue())
    response.noContent()
  }

  async markAll(ctx: HttpContext) {
    const { response } = ctx
    await this.actions
      .makeMarkAllNotificationsAsRead(actionContextFromHttp(ctx))
      .executeAndWrap()
      .then((outcome) => outcome.getValue())
    response.noContent()
  }
}
