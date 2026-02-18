import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import {
  buildPaginationMeta,
  normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination
} from '#modules/pagination/public_contracts/pagination_public_api'

const NOTIFICATIONS_DEFAULT_LIMIT = 15

/**
 * GET /notifications → List notifications (Inertia page)
 */
export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(optionalActionContextFromHttp(ctx))
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
      const before = typeof request.input('before') === 'string' ? String(request.input('before')) : null
      const result = await getUserNotifications.handle({
        page: after || before ? 1 : pagination.page,
        limit: pagination.perPage,
        after,
        before,
        unread_only: unreadOnly,
      })
      return await inertia.render('notifications/index', {
        notifications: serializeNotifications(result.notifications),
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
    } catch {
      const pagination = normalizePagination({}, PAGINATION, {
        perPage: NOTIFICATIONS_DEFAULT_LIMIT,
      })

      // Gracefully handle missing notifications table or other DB errors
      return await inertia.render('notifications/index', {
        notifications: [],
        pagination: toCanonicalPagePagination({
          total: 0,
          perPage: pagination.perPage,
          currentPage: pagination.page,
          lastPage: buildPaginationMeta(0, pagination).lastPage,
          mode: 'cursor',
          cursor: {
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
        unread_count: 0,
        filters: {
          page: pagination.page,
          limit: pagination.perPage,
          after: null,
          before: null,
          unread_only: false,
        },
      })
    }
  }
}
