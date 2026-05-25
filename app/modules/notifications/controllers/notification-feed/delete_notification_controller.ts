import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
@inject()
export default class DeleteNotificationController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    await this.actions
      .makeDeleteNotification(actionContextFromHttp(ctx))
      .executeAndWrap({ id: params['notificationId'] as string })
      .then((outcome) => outcome.getValue())
    response.noContent()
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    await this.actions
      .makeDeleteAllReadNotifications(actionContextFromHttp(ctx))
      .executeAndWrap()
      .then((outcome) => outcome.getValue())
    response.noContent()
  }
}
