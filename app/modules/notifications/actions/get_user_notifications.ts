import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'

interface GetNotificationsOptions {
  user_id?: string
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
  constructor(protected execCtx: NotificationActionContext) {}

  async handle(options: GetNotificationsOptions = {}): Promise<GetNotificationsResult> {
    // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
    const userId = options.user_id ?? this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy ID người dùng')
    }

    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const unreadOnly = options.unread_only ?? false

    const repo = notificationRepositoryProvider.getNotificationRepository()

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
