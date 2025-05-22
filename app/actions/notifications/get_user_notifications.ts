import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'

interface GetNotificationsOptions {
  user_id?: number | string
  page?: number
  limit?: number
  unread_only?: boolean
}

@inject()
export default class GetUserNotifications {
  constructor(protected ctx: HttpContext) {}

  async handle(options: GetNotificationsOptions = {}) {
    // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
    const userId = options.user_id || this.ctx.auth.user?.id
    if (!userId) {
      throw new Error('Không tìm thấy ID người dùng')
    }

    const page = options.page || 1
    const limit = options.limit || 10
    const unreadOnly = options.unread_only || false

    // Xây dựng truy vấn
    const query = Notification.query().where('user_id', userId).orderBy('created_at', 'desc')

    // Lọc chỉ lấy thông báo chưa đọc nếu cần
    if (unreadOnly) {
      query.where('is_read', false)
    }

    // Phân trang kết quả
    const notifications = await query.paginate(page, limit)

    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.query()
      .where('user_id', userId)
      .where('is_read', false)
      .count('id as total')
      .first()

    return {
      notifications,
      unread_count: unreadCount ? Number(unreadCount.$extras.total) : 0,
    }
  }
}
