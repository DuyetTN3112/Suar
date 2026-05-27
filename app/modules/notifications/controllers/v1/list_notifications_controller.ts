import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1NotificationResponse, mapApiV1Pagination } from '#modules/http/api_v1/response_mappers'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const page = Math.max(1, toNumber(ctx.request.input('page'), PAGINATION.DEFAULT_PAGE))
    const perPage = Math.min(
      PAGINATION.MAX_PER_PAGE,
      Math.max(1, toNumber(ctx.request.input('perPage'), PAGINATION.DEFAULT_PER_PAGE))
    )
    const unreadOnly = toBoolean(ctx.request.input('unreadOnly'), false)

    const result = await new GetUserNotifications(optionalActionContextFromHttp(ctx)).handle({
      page,
      limit: perPage,
      unread_only: unreadOnly,
    })

    return {
      data: serializeNotifications(result.notifications).map(mapApiV1NotificationResponse),
      pagination: mapApiV1Pagination(result.meta),
      unreadCount: result.unread_count,
    }
  }
}
