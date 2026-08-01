import type { NotificationActionDescriptor } from '#modules/notifications/domain/notification_catalog'

export interface ActiveNotificationSearchDocument {
  notificationId: string
  eventId: string
  recipientId: string
  scopeType: string
  scopeId: string | null
  organizationId: string | null
  type: string
  schemaVersion: number
  category: string
  priority: string
  state: 'read' | 'unread'
  title: string
  body: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  action: NotificationActionDescriptor | null
  metadata: Record<string, unknown> | null
  occurredAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
  revision: number
  projectionVersion: number
  deleted: false
  deletedAt: null
}

export interface DeletedNotificationSearchDocument {
  notificationId: string
  recipientId: string
  revision: number
  projectionVersion: number
  deleted: true
  deletedAt: string
}

export type NotificationSearchDocument =
  | ActiveNotificationSearchDocument
  | DeletedNotificationSearchDocument

export interface CanonicalNotificationProjectionRow {
  id: string
  event_id: string
  user_id: string
  scope_type: string
  scope_id: string | null
  organization_id: string | null
  type: string
  schema_version: number | string
  category: string
  priority: string
  is_read: boolean
  title: string
  message: string
  related_entity_type: string | null
  related_entity_id: string | null
  action: NotificationActionDescriptor | null
  occurred_at: Date
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
  revision: number | string
}

export interface NotificationTombstoneProjectionRow {
  notification_id: string
  recipient_id: string
  final_revision: number | string
  deleted_at: Date
}

function iso(value: Date): string {
  return new Date(value).toISOString()
}

export function toActiveNotificationSearchDocument(
  row: CanonicalNotificationProjectionRow
): NotificationSearchDocument {
  return {
    notificationId: row.id,
    eventId: row.event_id,
    recipientId: row.user_id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    organizationId: row.organization_id,
    type: row.type,
    schemaVersion: Number(row.schema_version),
    category: row.category,
    priority: row.priority,
    state: row.is_read ? 'read' : 'unread',
    title: row.title,
    body: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    action: row.action,
    metadata: null,
    occurredAt: iso(row.occurred_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at ?? row.created_at),
    readAt: row.read_at ? iso(row.read_at) : null,
    revision: Number(row.revision),
    projectionVersion: 1,
    deleted: false,
    deletedAt: null,
  }
}

export function toNotificationTombstoneSearchDocument(
  row: NotificationTombstoneProjectionRow
): NotificationSearchDocument {
  return {
    notificationId: row.notification_id,
    recipientId: row.recipient_id,
    revision: Number(row.final_revision),
    projectionVersion: 1,
    deleted: true,
    deletedAt: iso(row.deleted_at),
  }
}
