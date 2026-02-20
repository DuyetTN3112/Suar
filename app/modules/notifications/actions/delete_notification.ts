import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'

export default class DeleteNotification {
  constructor(protected execCtx: NotificationActionContext) {}

  async handle({ id }: { id: string }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const repo = notificationRepositoryProvider.getNotificationRepository()
    const deleted = await repo.delete(id, userId)

    if (!deleted) {
      throw NotFoundException.resource('Notification', id)
    }

    return { success: true }
  }
  // Xóa tất cả thông báo đã đọc → delegate to Model
  async deleteAllRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const repo = notificationRepositoryProvider.getNotificationRepository()
    await repo.deleteAllRead(userId)
    return { success: true }
  }
}
