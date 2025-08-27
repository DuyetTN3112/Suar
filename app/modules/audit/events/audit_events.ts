
export interface AuditableEvent {
  readonly eventType: string
  readonly actorId: string
  readonly occurredAt: Date
  readonly payload: unknown
}

export interface AuditLogEvent {
  userId: string | null
  action: string
  entityType?: string
  entityId?: number | string | null
  ipAddress?: string
  userAgent?: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'audit:log': AuditLogEvent
  }
}
