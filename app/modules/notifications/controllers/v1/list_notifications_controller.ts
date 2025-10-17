import type { HttpContext } from '@adonisjs/core/http'

import { mapApiV1NotificationResponse, mapApiV1Pagination } from '#modules/http/api_v1/response_mappers'
import { optionalActionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const pagination = normalizePagination(
      {
        page: ctx.request.input('page'),
        perPage: ctx.request.input('perPage'),
      },
      PAGINATION
    )
    const unreadOnly = toBoolean(ctx.request.input('unreadOnly'), false)

    const result = await new GetUserNotifications(optionalActionContextFromHttp(ctx)).handle({
      page: pagination.page,
      limit: pagination.perPage,
      unread_only: unreadOnly,
    })

    return {
      data: serializeNotifications(result.notifications).map(mapApiV1NotificationResponse),
      pagination: mapApiV1Pagination(result.meta),
      unreadCount: result.unread_count,
    }
  }
}
