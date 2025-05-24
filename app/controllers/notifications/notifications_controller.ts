import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'
import DeleteNotification from '#actions/notifications/delete_notification'
import Notification from '#models/notification'
import db from '@adonisjs/lucid/services/db'

export default class NotificationsController {
  @inject()
  async index({ request, inertia }: HttpContext, getUserNotifications: GetUserNotifications) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 15)
    const unreadOnly = request.input('unread_only') === 'true'
    try {
      const result = await getUserNotifications.handle({
        page,
        limit,
        unread_only: unreadOnly,
      })
      return inertia.render('notifications/index', {
        notifications: result.notifications,
        unread_count: result.unread_count,
        filters: {
          page,
          limit,
          unread_only: unreadOnly,
        },
      })
    } catch (error) {
      return inertia.render('notifications/index', {
        error: error.message || 'Có lỗi xảy ra khi tải thông báo',
      })
    }
  }

  @inject()
  async latest({ request, response }: HttpContext, getUserNotifications: GetUserNotifications) {
    const limit = request.input('limit', 10) // Tăng limit để hiển thị nhiều thông báo hơn
    try {
      const result = await getUserNotifications.handle({
        page: 1,
        limit,
        unread_only: false, // Hiển thị tất cả thông báo, không chỉ thông báo chưa đọc
      })
      
      // Log dữ liệu để debug
      console.log('Notifications data:', result.notifications.toJSON())
      
      // Xử lý dữ liệu notification để đảm bảo định dạng ngày tháng hợp lệ
      const notificationsData = result.notifications.toJSON().data.map((notification: any) => {
        // Log từng notification để debug
        console.log('Individual notification:', notification)
        
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
          created_at: notification.created_at ? 
            (typeof notification.created_at === 'string' ? notification.created_at : notification.created_at.toISO()) : 
            new Date().toISOString(),
          updated_at: notification.updated_at ? 
            (typeof notification.updated_at === 'string' ? notification.updated_at : notification.updated_at.toISO()) : 
            new Date().toISOString(),
          read_at: notification.read_at ? 
            (typeof notification.read_at === 'string' ? notification.read_at : notification.read_at.toISO()) : 
            null,
        }
      })
      
      return response.json({
        notifications: notificationsData,
        unread_count: result.unread_count,
      })
    } catch (error) {
      console.error('Error in latest notifications:', error)
      return response.status(500).json({
        error: error.message || 'Có lỗi xảy ra khi tải thông báo',
      })
    }
  }

  @inject()
  async markAsRead({ params, response }: HttpContext) {
    try {
      // Tìm thông báo
      const notification = await Notification.findOrFail(params.id)
      // Cập nhật trạng thái đã đọc
      notification.is_read = true
      await notification.save()
      return response.json({ success: true })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: error.message || 'Thông báo không tồn tại',
      })
    }
  }

  @inject()
  async markAllAsRead({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      // Cập nhật tất cả thông báo chưa đọc của người dùng
      await Notification.query()
        .where('user_id', user.id)
        .where('is_read', false)
        .update({ is_read: true })
      return response.json({ success: true })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi đánh dấu đã đọc',
      })
    }
  }

  @inject()
  async destroy({ params, response }: HttpContext) {
    try {
      // Tìm và xóa thông báo
      const notification = await Notification.findOrFail(params.id)
      await notification.delete()
      return response.json({ success: true })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: error.message || 'Thông báo không tồn tại',
      })
    }
  }

  @inject()
  async destroyAllRead({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      // Xóa tất cả thông báo đã đọc của người dùng
      await Notification.query().where('user_id', user.id).where('is_read', true).delete()
      return response.json({ success: true })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa thông báo',
      })
    }
  }
}