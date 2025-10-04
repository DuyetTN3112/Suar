import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { NOTIFICATION_PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
interface GetNotificationsOptions {
  user_id?: string
  page?: number
  limit?: number
  after?: string | null
  before?: string | null
  unread_only?: boolean
}

interface GetNotificationsResult {
  notifications: NotificationRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  unread_count: number
  cursor: {
    next_cursor: string | null
    previous_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

export default class GetUserNotifications {
  constructor(protected execCtx: NotificationActionContext) {}

  async handle(options: GetNotificationsOptions = {}): Promise<GetNotificationsResult> {
    // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
    const userId = options.user_id ?? this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy ID người dùng')
    }

    const pagination = normalizePagination(
      {
        page: options.page,
        limit: options.limit,
      },
      NOTIFICATION_PAGINATION,
      {
        perPage: 10,
      }
    )
    const unreadOnly = options.unread_only ?? false
    const after = decodeTimestampCursor(options.after)?.id ? options.after ?? null : null
    const before = decodeTimestampCursor(options.before)?.id ? options.before ?? null : null

    const repo = notificationRepositoryProvider.getNotificationRepository()
    const legacyResult = await repo.findByUser(userId, omitUndefined({
      page: pagination.page,
      limit: pagination.perPage,
      isRead: unreadOnly ? false : undefined,
    }))

    const cursorResult = after || before
      ? await repo.findByUserCursor(userId, omitUndefined({
          after,
          before,
          limit: pagination.perPage,
          isRead: unreadOnly ? false : undefined,
        }))
      : (() => {
          const meta = buildPaginationMeta(legacyResult.total, pagination)
          const lastNotification = legacyResult.data[legacyResult.data.length - 1]
          const hasNextPage = pagination.page < meta.lastPage

          return {
            data: legacyResult.data,
            nextCursor:
              hasNextPage && lastNotification
                ? encodeTimestampCursor({
                    createdAt: lastNotification.created_at.toISOString(),
                    id: lastNotification.id,
                  })
                : null,
            previousCursor: null,
            hasNextPage,
            hasPreviousPage: pagination.page > 1,
          }
        })()

    const unreadCount = await repo.getUnreadCount(userId)

    return {
      notifications: after || before ? cursorResult.data : legacyResult.data,
      meta: {
        total: legacyResult.total,
        per_page: pagination.perPage,
        current_page: after || before ? 1 : pagination.page,
        last_page: buildPaginationMeta(legacyResult.total, {
          page: 1,
          perPage: pagination.perPage,
        }).lastPage,
      },
      unread_count: unreadCount,
      cursor: {
        next_cursor: cursorResult.nextCursor,
        previous_cursor: cursorResult.previousCursor,
        has_next_page: cursorResult.hasNextPage,
        has_previous_page: cursorResult.hasPreviousPage,
      },
    }
  }
}
