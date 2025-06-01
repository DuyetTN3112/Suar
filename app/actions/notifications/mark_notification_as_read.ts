import Notification from '#models/notification'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

export default class MarkNotificationAsRead {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: DatabaseId }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    // Tìm thông báo thuộc user → delegate to Model
    const notification = await Notification.findByUserOrFail(id, userId)
    // Đánh dấu đã đọc
    notification.is_read = true
    await notification.save()
    return notification
  }
  // Đánh dấu tất cả thông báo của người dùng là đã đọc → delegate to Model
  async markAllAsRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    await Notification.markAllAsReadByUser(userId)
    return { success: true }
  }
}
