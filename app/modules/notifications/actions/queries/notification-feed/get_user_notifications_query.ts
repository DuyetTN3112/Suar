import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/notifications/actions/base_query'
import { NOTIFICATION_PAGINATION } from '#modules/notifications/actions/dtos/common/notification_pagination'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationFeedReader } from '#modules/notifications/actions/ports/outbound/notification-feed/notification_feed_reader'
import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'
import type { NotificationUnreadCountReader } from '#modules/notifications/actions/ports/outbound/notification_unread_count_reader'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
export interface GetNotificationsOptions {
  user_id?: string
  page?: number
  limit?: number
  after?: string | null
  before?: string | null
  unread_only?: boolean
}

export interface GetNotificationsResult {
  notifications: NotificationRecord[]
  meta: {
    total: number
    total_exact: boolean
    total_relation: 'exact' | 'lower_bound'
    per_page: number
    current_page: number
    last_page: number
  }
  unread_count: number
  recipient_id: string
  recipient_state_revision: number
  cursor: {
    next_cursor: string | null
    previous_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

export interface GetUserNotificationsDependencies {
  feedReader: NotificationFeedReader
  unreadCountReader: NotificationUnreadCountReader
}

export class GetUserNotificationsQuery extends BaseQuery<
  GetNotificationsOptions,
  GetNotificationsResult
> {
  constructor(
    protected readonly execCtx: NotificationActionContext,
    private readonly dependencies: GetUserNotificationsDependencies
  ) {
    super()
  }

  override async execute(options: GetNotificationsOptions = {}): Promise<GetNotificationsResult> {
    const userId = options.user_id ?? this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy ID người dùng')
    }
    if (this.execCtx.userId !== userId) {
      throw new UnauthorizedException('Không được phép đọc thông báo của người dùng khác')
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
    const feed = await this.dependencies.feedReader.read({
      recipientId: userId,
      page: pagination.page,
      limit: pagination.perPage,
      unreadOnly,
      after: options.after ?? null,
      before: options.before ?? null,
    })
    const unreadCount = await this.dependencies.unreadCountReader.get(userId, {
      consistency: feed.source === 'elasticsearch' ? 'eventual' : 'strong',
    })
    const totalExact = feed.total !== null
    const effectiveTotal = feed.total ?? feed.data.length + (feed.hasNextPage ? 1 : 0)
    const meta = buildPaginationMeta(effectiveTotal, pagination)

    return {
      notifications: feed.data,
      meta: {
        total: effectiveTotal,
        total_exact: totalExact,
        total_relation: totalExact ? 'exact' : 'lower_bound',
        per_page: pagination.perPage,
        current_page: options.after || options.before ? 1 : pagination.page,
        last_page: meta.lastPage,
      },
      unread_count: unreadCount.count,
      recipient_id: userId,
      recipient_state_revision: unreadCount.revision,
      cursor: {
        next_cursor: feed.nextCursor,
        previous_cursor: feed.previousCursor,
        has_next_page: feed.hasNextPage,
        has_previous_page: feed.hasPreviousPage,
      },
    }
  }
}
