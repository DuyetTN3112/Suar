import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  mapApiV1NotificationResponse,
  mapApiV1Pagination,
} from '#modules/http/boundary/api_v1_response'
import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/actions/dtos/common/notification_pagination'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { mapNotificationResponses } from '#modules/notifications/controllers/mappers/response/notification_response_mapper'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

@inject()
export default class ListNotificationsController {
  constructor(private readonly actions: NotificationActionFactory) {}

  async handle(ctx: HttpContext) {
    const pagination = normalizePagination(
      {
        page: ctx.request.input('page'),
        perPage: ctx.request.input('perPage'),
      },
      PAGINATION
    )
    const unreadOnly = toBoolean(ctx.request.input('unreadOnly'), false)
    const after =
      typeof ctx.request.input('after') === 'string' ? String(ctx.request.input('after')) : null
    const before =
      typeof ctx.request.input('before') === 'string' ? String(ctx.request.input('before')) : null

    const result = await this.actions
      .makeGetUserNotifications(optionalActionContextFromHttp(ctx))
      .execute({
        page: after || before ? 1 : pagination.page,
        limit: pagination.perPage,
        after,
        before,
        unread_only: unreadOnly,
      })

    return {
      data: mapNotificationResponses(result.notifications).map(mapApiV1NotificationResponse),
      pagination: mapApiV1Pagination({
        ...result.meta,
        cursor: result.cursor,
      }),
      recipientId: result.recipient_id,
      unreadCount: result.unread_count,
      recipientStateRevision: result.recipient_state_revision,
    }
  }
}
