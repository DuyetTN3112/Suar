export interface NotificationCommandV1Input {
  eventId: string
  type: string
  schemaVersion: 1
  recipientId: string
  scope: { kind: 'user'; id: string } | { kind: 'organization'; id: string } | { kind: 'system' }
  actor?: { type: string; id: string }
  subject?: { type: string; id: string }
  parameters: Record<string, unknown>
  occurredAt: string
  correlationId?: string
  dedupeKey?: string
}
