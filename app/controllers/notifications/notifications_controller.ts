import type { HttpContext } from '@adonisjs/core/http'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
// import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'
// import DeleteNotification from '#actions/notifications/delete_notification'
import Notification from '#models/notification'
import loggerService from '#services/logger_service'
// import db from '@adonisjs/lucid/services/db'

/**
 * Interface cho notification data sau khi serialize
 * Dựa trên Notification model và database schema
 */
interface NotificationData {
  id: number
  user_id: number
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata?: Record<string, unknown>
  created_at: string | { toISO: () => string }
  updated_at?: string | { toISO: () => string }
  read_at?: string | { toISO: () => string } | null
}

export default class NotificationsController {
  async index(ctx: HttpContext) {
    const { request, inertia } = ctx
    const getUserNotifications = new GetUserNotifications(ctx)
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 15))
    const unreadOnly = request.input('unread_only') === 'true'
    try {
      const result = await getUserNotifications.handle({
        page,
        limit,
        unread_only: unreadOnly,
      })
      return await inertia.render('notifications/index', {
        notifications: result.notifications,
        unread_count: result.unread_count,
        filters: {
          page,
          limit,
          unread_only: unreadOnly,
        },
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải thông báo'
      return inertia.render('notifications/index', {
        error: errorMessage,
      })
    }
  }

  async latest(ctx: HttpContext) {
    const { request, response } = ctx
    const getUserNotifications = new GetUserNotifications(ctx)
    const limit = Number(request.input('limit', 10)) // Tăng limit để hiển thị nhiều thông báo hơn
    try {
      const result = await getUserNotifications.handle({
        page: 1,
        limit,
        unread_only: false, // Hiển thị tất cả thông báo, không chỉ thông báo chưa đọc
      })

      // Xử lý dữ liệu notification để đảm bảo định dạng ngày tháng hợp lệ
      const jsonResult = result.notifications.toJSON()
      const rawData = jsonResult.data as NotificationData[]
      const notificationsData = rawData.map((notification) => {
        return {
          id: notification.id,
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          is_read: notification.is_read,
          type: notification.type,
          related_entity_type: notification.related_entity_type,
          related_entity_id: notification.related_entity_id,
          metadata: notification.metadata,
          created_at: notification.created_at
            ? typeof notification.created_at === 'string'
              ? notification.created_at
              : notification.created_at.toISO()
            : new Date().toISOString(),
          updated_at: notification.updated_at
            ? typeof notification.updated_at === 'string'
              ? notification.updated_at
              : notification.updated_at.toISO()
            : new Date().toISOString(),
          read_at: notification.read_at
            ? typeof notification.read_at === 'string'
              ? notification.read_at
              : notification.read_at.toISO()
            : null,
        }
      })

      response.json({
        notifications: notificationsData,
        unread_count: result.unread_count,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải thông báo'
      loggerService.error('Error in latest notifications:', error)
      response.status(500).json({
        error: errorMessage,
      })
      return
    }
  }

  async markAsRead({ params, response }: HttpContext) {
    try {
      // Tìm thông báo
      const notification = await Notification.findOrFail(params.id)
      // Cập nhật trạng thái đã đọc
      notification.is_read = true
      await notification.save()
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Thông báo không tồn tại'
      response.status(404).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }

  async markAllAsRead({ response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        response.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục',
        })
        return
      }
      // Cập nhật tất cả thông báo chưa đọc của người dùng
      await Notification.query()
        .where('user_id', user.id)
        .where('is_read', false)
        .update({ is_read: true })
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi đánh dấu đã đọc'
      response.status(500).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      // Tìm và xóa thông báo
      const notification = await Notification.findOrFail(params.id)
      await notification.delete()
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Thông báo không tồn tại'
      response.status(404).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }

  async destroyAllRead({ response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        response.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục',
        })
        return
      }
      // Xóa tất cả thông báo đã đọc của người dùng
      await Notification.query().where('user_id', user.id).where('is_read', true).delete()
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa thông báo'
      response.status(500).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
