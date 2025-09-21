import type { Types } from 'mongoose'

import type { UserActivityLogRecord } from '#infra/user_activity/repositories/user_activity_repository_interface'

export interface ActivityLogLeanDoc {
  _id: Types.ObjectId
  user_id: string
  action_type: string
  action_data?: Record<string, unknown>
  related_entity_type?: string
  related_entity_id?: string
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

export const toUserActivityLogRecord = (doc: ActivityLogLeanDoc): UserActivityLogRecord => {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    action_type: doc.action_type,
    action_data: doc.action_data ?? null,
    related_entity_type: doc.related_entity_type ?? null,
    related_entity_id: doc.related_entity_id ?? null,
    ip_address: doc.ip_address ?? null,
    user_agent: doc.user_agent ?? null,
    created_at: doc.created_at ?? new Date(),
  }
}
