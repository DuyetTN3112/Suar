import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { NotificationRecord } from '#infra/shared/repositories/interfaces'
import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

interface GetNotificationsOptions {
  user_id?: DatabaseId
  page?: number
  limit?: number
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
}

export default class GetUserNotifications {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(options: GetNotificationsOptions = {}): Promise<GetNotificationsResult> {
    // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
    const userId = options.user_id ?? this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy ID người dùng')
    }

    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const unreadOnly = options.unread_only ?? false

    const repo = await RepositoryFactory.getNotificationRepository()

    const { data, total } = await repo.findByUser(userId, {
      page,
      limit,
      isRead: unreadOnly ? false : undefined,
    })

    const unreadCount = await repo.getUnreadCount(userId)

    return {
      notifications: data,
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / limit)),
      },
      unread_count: unreadCount,
    }
  }
}
