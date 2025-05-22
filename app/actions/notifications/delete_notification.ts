import Notification from '#models/notification'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DeleteNotification {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user!
    // Tìm thông báo cần xóa
    const notification = await Notification.query()
      .where('id', id)
      .where('user_id', user.id)
      .firstOrFail()
    // Xóa thông báo
    await notification.delete()
    return { success: true }
  }
  // Xóa tất cả thông báo đã đọc
  async deleteAllRead() {
    const user = this.ctx.auth.user!
    await Notification.query().where('user_id', user.id).where('is_read', true).delete()
    return { success: true }
  }
}
