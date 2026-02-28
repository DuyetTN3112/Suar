import Notification from '#models/notification'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

interface GetNotificationsOptions {
  user_id?: DatabaseId
  page?: number
  limit?: number
  unread_only?: boolean
}

export default class GetUserNotifications {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(options: GetNotificationsOptions = {}) {
    // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
    const userId = options.user_id || this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy ID người dùng')
    }

    const page = options.page || 1
    const limit = options.limit || 10
    const unreadOnly = options.unread_only || false

    // Delegate to Model static methods
    const notifications = await Notification.paginateByUser(userId, {
      page,
      limit,
      isRead: unreadOnly ? false : undefined,
    })

    // Đếm số thông báo chưa đọc → delegate to Model
    const unreadCount = await Notification.countUnreadByUser(userId)

    return {
      notifications,
      unread_count: unreadCount,
    }
  }
}
