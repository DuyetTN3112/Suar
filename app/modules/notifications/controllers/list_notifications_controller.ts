import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/actions/dtos/common/notification_pagination'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { mapNotificationResponses } from '#modules/notifications/controllers/mappers/response/notification_response_mapper'
import {
  normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

const NOTIFICATIONS_DEFAULT_LIMIT = 15

/**
 * GET /notifications → List notifications (Inertia page)
 */
@inject()
export default class ListNotificationsController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    const getUserNotifications = this.actions.makeGetUserNotifications(
      optionalActionContextFromHttp(ctx)
    )
    const pagination = normalizePagination(
      {
        page: request.input('page'),
        limit: request.input('limit'),
      },
      PAGINATION,
      {
        perPage: NOTIFICATIONS_DEFAULT_LIMIT,
      }
    )
    const unreadOnly = request.input('unread_only') === 'true'
    const after = typeof request.input('after') === 'string' ? String(request.input('after')) : null
    const before =
      typeof request.input('before') === 'string' ? String(request.input('before')) : null
    const result = await getUserNotifications.execute({
      page: after || before ? 1 : pagination.page,
      limit: pagination.perPage,
      after,
      before,
      unread_only: unreadOnly,
    })
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
