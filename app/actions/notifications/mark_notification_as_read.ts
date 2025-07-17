import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export default class MarkNotificationAsRead {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: DatabaseId }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const repo = await RepositoryFactory.getNotificationRepository()
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
    const repo = await RepositoryFactory.getNotificationRepository()
    await repo.markAllAsRead(userId)
    return { success: true }
  }
}
