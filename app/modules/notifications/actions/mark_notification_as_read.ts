import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'

export default class MarkNotificationAsRead {
  constructor(protected execCtx: NotificationActionContext) {}

  async handle({ id }: { id: string }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const repo = notificationRepositoryProvider.getNotificationRepository()
    const updated = await repo.markAsRead(id, userId)

    if (!updated) {
      throw NotFoundException.resource('Notification', id)
    }

    return { success: true }
  }
  // Đánh dấu tất cả thông báo của người dùng là đã đọc → delegate to Model
  async markAllAsRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const repo = notificationRepositoryProvider.getNotificationRepository()
    await repo.markAllAsRead(userId)
    return { success: true }
  }
}
