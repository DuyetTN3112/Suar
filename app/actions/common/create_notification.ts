import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Notification from '#models/notification'

type NotificationData = {
  user_id: number | string
  title: string
  message: string
  type: string
  related_entity_type?: string
  related_entity_id?: number | string
}

export default class CreateNotification {
  constructor(protected ctx: HttpContext) {}

  async handle(data: NotificationData): Promise<Notification | null> {
    try {
      // Sử dụng stored procedure để tạo thông báo
      await db.rawQuery('CALL create_notification(?, ?, ?, ?, ?, ?)', [
        data.user_id,
        data.title,
        data.message,
        data.type,
        data.related_entity_type || null,
        data.related_entity_id || null,
      ])

      // Trả về thông báo vừa tạo
      const notification = await Notification.query()
        .where('user_id', data.user_id)
        .where('title', data.title)
        .where('type', data.type)
        .orderBy('created_at', 'desc')
        .first()

      return notification
    } catch (_error) {
      return null
    }
  }
}
