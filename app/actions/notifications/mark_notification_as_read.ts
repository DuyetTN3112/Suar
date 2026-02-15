import Notification from '#models/notification'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

@inject()
export default class MarkNotificationAsRead {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: DatabaseId }) {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    // Tìm thông báo cần đánh dấu
    const notification = await Notification.query()
      .where('id', id)
      .where('user_id', user.id)
      .firstOrFail()
    // Đánh dấu đã đọc
    notification.is_read = true
    await notification.save()
    return notification
  }
  // Đánh dấu tất cả thông báo của người dùng là đã đọc
  async markAllAsRead() {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    await Notification.query()
      .where('user_id', user.id)
      .where('is_read', false)
      .update({ is_read: true })
    return { success: true }
  }
}
