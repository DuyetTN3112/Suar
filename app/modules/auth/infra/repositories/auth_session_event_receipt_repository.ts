import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  AuthSessionEventReceiptStore,
  AuthSessionEvidenceTransaction,
} from '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type { AuthSessionObservedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'

const TABLE = 'auth_session_event_receipts'

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

export function buildAuthSessionEventFingerprint(
  payload: AuthSessionObservedOutboxPayload
): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex')
}

export class PostgresAuthSessionEventReceiptRepository implements AuthSessionEventReceiptStore {
  async claim(
    transaction: AuthSessionEvidenceTransaction,
    payload: AuthSessionObservedOutboxPayload
  ): Promise<boolean> {
    const trx = transaction as TransactionClientContract
    const fingerprint = buildAuthSessionEventFingerprint(payload)
    const inserted = (await trx
      .table(TABLE)
      .insert({
        event_id: payload.eventId,
        payload_fingerprint: fingerprint,
        event_version: 1,
        user_id: payload.userId,
        action: payload.action,
        occurred_at: new Date(payload.occurredAt),
      })
      .onConflict('event_id')
      .ignore()
      .returning(['event_id'])) as Array<{ event_id: string }>
    if (inserted.length === 1) {
      return true
    }

    const existing = (await trx
      .from(TABLE)
      .where('event_id', payload.eventId)
      .select('payload_fingerprint')
      .first()) as { payload_fingerprint: string } | undefined
    if (!existing) {
      throw new DomainEventDeliveryError('AUTH_SESSION_RECEIPT_CONFLICT_UNRESOLVED', true)
    }
    if (existing.payload_fingerprint !== fingerprint) {
      throw new DomainEventDeliveryError('AUTH_SESSION_RECEIPT_COLLISION', false)
    }
    return false
  }
}

export const authSessionEventReceiptRepository = new PostgresAuthSessionEventReceiptRepository()
