import type { DatabaseId } from '#types/database'

export interface UserActivityLogCreateData {
  user_id: DatabaseId
  action_type: string
  action_data?: Record<string, unknown> | null
  related_entity_type?: string | null
  related_entity_id?: DatabaseId | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface UserActivityLogRecord {
  id: string
  user_id: string
  action_type: string
  action_data: Record<string, unknown> | null
  related_entity_type: string | null
  related_entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export interface UserActivityLogRepository {
  create(data: UserActivityLogCreateData): Promise<void>
  findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }>
}
