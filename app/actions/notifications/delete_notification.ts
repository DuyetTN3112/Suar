import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { notificationRepositoryProvider } from '#infra/notifications/repositories/notification_repository_provider'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export default class DeleteNotification {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: DatabaseId }) {
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
