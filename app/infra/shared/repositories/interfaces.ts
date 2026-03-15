import type { DatabaseId } from '#types/database'

/**
 * Repository Interfaces — Sprint 5: Multi-DB Architecture
 *
 * Abstracts persistence layer for high-write entities:
 *   - AuditLog: Append-only, never joined, huge volume
 *   - Notification: High write, simple reads, TTL auto-expire
 *   - UserActivityLog: Append-only, time-series
 *
 * Implementations:
 *   - MysqlXxxRepository: Lucid ORM (MySQL/PostgreSQL)
 *   - MongoXxxRepository: Mongoose (MongoDB)
 *
 * Toggle via env var:
 *   - AUDIT_STORAGE=mysql|mongodb|both
 *   - NOTIFICATION_STORAGE=mysql|mongodb|both
 *   - ACTIVITY_LOG_STORAGE=mysql|mongodb|both
 */

// ─── Audit Log ───────────────────────────────────────────────

export interface AuditLogCreateData {
  user_id: DatabaseId | null
  action: string
  entity_type: string
  entity_id?: DatabaseId | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface AuditLogRecord {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export interface AuditLogQuery {
  user_id?: DatabaseId
  entity_type?: string
  entity_id?: DatabaseId
  action?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}

export interface AuditLogRepository {
  /**
   * Create a new audit log entry.
   * This is the primary write operation — optimized for speed.
   */
  create(data: AuditLogCreateData): Promise<void>

  /**
   * Query audit logs with filters and pagination.
   * Used by admin dashboards only — not performance-critical.
   */
  findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }>

  /**
   * Get total count matching filters (for pagination).
   */
  count(query: AuditLogQuery): Promise<number>

  /**
   * Get last activity timestamps for given users on an entity.
   */
  getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>>
}

// ─── Notification ────────────────────────────────────────────

export interface NotificationCreateData {
  user_id: DatabaseId
  title: string
  message: string
  type: string
  related_entity_type?: string | null
  related_entity_id?: DatabaseId | null
  metadata?: Record<string, unknown> | null
}

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
}

export interface NotificationRepository {
  /**
   * Create a new notification.
   */
  create(data: NotificationCreateData): Promise<NotificationRecord | null>

  /**
   * Get user's notifications (paginated, newest first).
   */
  findByUser(
    userId: DatabaseId,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }>

  /**
   * Mark a notification as read.
   */
  markAsRead(notificationId: DatabaseId): Promise<void>

  /**
   * Mark all notifications as read for a user.
   */
  markAllAsRead(userId: DatabaseId): Promise<void>

  /**
   * Get unread count for a user.
   */
  getUnreadCount(userId: DatabaseId): Promise<number>
}

// ─── User Activity Log ──────────────────────────────────────

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
  /**
   * Log a user activity.
   */
  create(data: UserActivityLogCreateData): Promise<void>

  /**
   * Get user's activity log (paginated, newest first).
   */
  findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }>
}
