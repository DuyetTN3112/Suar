import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { buildNotificationRouteRequest } from '#modules/notifications/controllers/mappers/request/notification-feed/notification_route_request_mapper'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
@inject()
export default class DeleteNotificationController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async destroy(ctx: HttpContext) {
    const { response } = ctx
    const { notificationId } = buildNotificationRouteRequest(ctx.params)
    await this.actions
      .makeDeleteNotification(actionContextFromHttp(ctx))
      .executeAndWrap({ id: notificationId })
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
