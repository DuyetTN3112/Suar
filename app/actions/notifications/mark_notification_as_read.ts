import Notification from '#models/notification'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MarkNotificationAsRead {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user!
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
    const user = this.ctx.auth.user!
    await Notification.query()
      .where('user_id', user.id)
      .where('is_read', false)
      .update({ is_read: true })
    return { success: true }
  }
}
