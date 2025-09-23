import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

type ErrorEventSeverity = 'error' | 'warning'

interface CreateErrorEventPayload {
  code: string
  status: number
  severity: ErrorEventSeverity
  message: string
  safe_message: string | null
  details: Record<string, unknown> | null
  request_id: string | null
  correlation_id: string | null
  actor_user_id: string | null
  actor_org_id: string | null
  method: string | null
  url: string | null
  ip_address: string | null
  user_agent: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function toUuidOrNull(value: string | null): string | null {
  if (!value) return null
  return UUID_PATTERN.test(value) ? value : null
}

export async function createErrorEvent(payload: CreateErrorEventPayload): Promise<void> {
  await db.table('error_events').insert({
    id: randomUUID(),
    code: payload.code,
    status: payload.status,
    severity: payload.severity,
    message: payload.message,
    safe_message: payload.safe_message,
    details: payload.details,
    request_id: toUuidOrNull(payload.request_id),
    correlation_id: toUuidOrNull(payload.correlation_id),
    actor_user_id: toUuidOrNull(payload.actor_user_id),
    actor_org_id: toUuidOrNull(payload.actor_org_id),
    method: payload.method,
    url: payload.url,
    ip_address: payload.ip_address,
    user_agent: payload.user_agent,
    created_at: new Date(),
  })
}
