import type { Types } from 'mongoose'

import type { NotificationRecord } from '#infra/notifications/repositories/notification_repository_interface'

export interface NotificationLeanDoc {
  _id: Types.ObjectId
  user_id: string
  title: string
  message: string
  is_read: boolean
  read_at?: Date | null
  type: string
  related_entity_type?: string
  related_entity_id?: string
  metadata?: Record<string, unknown>
  created_at?: Date
  updated_at?: Date
}

export const toNotificationRecord = (doc: NotificationLeanDoc): NotificationRecord => {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    title: doc.title,
    message: doc.message,
    is_read: doc.is_read,
    type: doc.type,
    related_entity_type: doc.related_entity_type ?? null,
    related_entity_id: doc.related_entity_id ?? null,
    metadata: doc.metadata ?? null,
    created_at: doc.created_at ?? new Date(),
    updated_at: doc.updated_at ?? null,
    read_at: doc.read_at ?? null,
  }
}
