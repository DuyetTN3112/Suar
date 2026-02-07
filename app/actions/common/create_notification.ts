import Notification from '#models/notification'

type NotificationData = {
  user_id: number | string
  title: string
  message: string
  type: string
  related_entity_type?: string
  related_entity_id?: number | string
}

/**
 * CreateNotification — stateless notification creator.
 * No dependency on HttpContext.
 */
export default class CreateNotification {
  async handle(data: NotificationData): Promise<Notification | null> {
    try {
      // Use Lucid model instead of stored procedure
      // The stored procedure only does a simple INSERT — same as Notification.create()
      const notification = await Notification.create({
        user_id: Number(data.user_id),
        title: data.title,
        message: data.message,
        type: data.type,
        related_entity_type: data.related_entity_type || null,
        related_entity_id: data.related_entity_id ? String(data.related_entity_id) : null,
      })

      return notification
    } catch (_error) {
      return null
    }
  }
}
