import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { buildListNotificationsRequest } from '#modules/notifications/controllers/mappers/request/notification-feed/list_notifications_request_mapper'
import { mapNotificationResponses } from '#modules/notifications/controllers/mappers/response/notification-feed/notification_response_mapper'
import { fromLegacySnakePagination, toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'


/**
 * GET /notifications → List notifications (Inertia page)
 */

@inject()
export default class ListNotificationsController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    const mapped = buildListNotificationsRequest(request)
    const getUserNotifications = this.actions.makeGetUserNotifications(
      optionalActionContextFromHttp(ctx)
    )
    const pagination = { page: mapped.page, perPage: mapped.perPage }
    const unreadOnly = mapped.unreadOnly
    const after = mapped.after
    const before = mapped.before
    const result = await getUserNotifications
      .executeAndWrap({
        page: after || before ? 1 : pagination.page,
        limit: pagination.perPage,
        after,
        before,
        unread_only: unreadOnly,
      })
      .then((outcome) => outcome.getValue())
    return inertia.render('notifications/index', {
      notifications: mapNotificationResponses(result.notifications),
      pagination: toCanonicalPagePagination(
        fromLegacySnakePagination({
          ...result.meta,
          cursor: result.cursor,
        })
      ),
      unread_count: result.unread_count,
      filters: {
        page: pagination.page,
        limit: pagination.perPage,
        after,
        before,
        unread_only: unreadOnly,
      },
    })
  }

}
