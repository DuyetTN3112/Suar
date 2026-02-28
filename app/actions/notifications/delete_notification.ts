import Notification from '#models/notification'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

export default class DeleteNotification {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: DatabaseId }) {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    // Tìm thông báo thuộc user → delegate to Model
    const notification = await Notification.findByUserOrFail(id, userId)
    // Xóa thông báo
    await notification.delete()
    return { success: true }
  }
  // Xóa tất cả thông báo đã đọc → delegate to Model
  async deleteAllRead() {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    await Notification.deleteAllReadByUser(userId)
    return { success: true }
  }
}
