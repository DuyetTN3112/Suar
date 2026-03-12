import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  authSessionAuditEvidenceWriter,
  authSessionEvidenceTransactionRunner,
  authSessionObservationStager,
} from '#composition/auth_application_composition'
import { onComposedAuthSessionObserved } from '#composition/auth_session_observed_composition'
import ProcessAuthSessionObservedCommand, {
  type ProcessAuthSessionObservedDependencies,
} from '#modules/auth/actions/commands/process_auth_session_observed_command'
import { authSessionEventReceiptRepository } from '#modules/auth/infra/repositories/auth_session_event_receipt_repository'
import { onAuthSessionObserved } from '#modules/auth/listeners/on_auth_session_observed'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/adonis_domain_event_dispatcher'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/postgres_domain_event_outbox_repository'
import { DomainEventOutboxWorker } from '#modules/events/infra/workers/domain_event_outbox_worker'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type { AuthSessionObservedEvent } from '#modules/events/public_contracts/domain_event_outbox'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

const SUCCESS_EVENT_ID = '9b8c272e-384b-4f8b-bbce-2f55bb432079'
const ROLLBACK_EVENT_ID = 'a5e523fd-b2ce-4e2a-9b47-d2c45762512e'
const OUTBOX_EVENT_ID = '44520e85-99d7-40e0-a102-3aa3618e532a'
const EVENT_IDS = [SUCCESS_EVENT_ID, ROLLBACK_EVENT_ID, OUTBOX_EVENT_ID]

function makeEvent(eventId: string): AuthSessionObservedEvent {
  return {
    eventId,
    userId: randomUUID(),
    action: 'login',
    occurredAt: '2026-07-26T10:00:00.000Z',
    ipAddress: '203.0.113.7',
    userAgent: 'durable-auth-integration',
    method: 'oauth',
    requestId: 'request-auth-integration',
    traceId: 'trace-auth-integration',
  }
}

async function cleanupEvidence(): Promise<void> {
  await db
    .from('audit_event_scopes')
    .whereIn('event_id', db.from('audit_events').select('id').whereIn('correlation_key', EVENT_IDS))
    .delete()
  await db.from('audit_events').whereIn('correlation_key', EVENT_IDS).delete()
  await db.from('auth_session_event_receipts').whereIn('event_id', EVENT_IDS).delete()
  await db
    .from('domain_event_outbox')
    .where('event_name', 'auth:session:observed:v1')
    .whereIn('dedupe_key', EVENT_IDS)
    .delete()
}

test.group('Integration | Durable auth session evidence', (group) => {
  group.setup(async () => {
    await assertSafeTestDatastores()
    await cleanupEvidence()
  })
  group.each.teardown(() => cleanupEvidence())
  group.teardown(() => cleanupEvidence())

  test('commits canonical audit and one receipt exactly once across replay', async ({ assert }) => {
    const event = makeEvent(SUCCESS_EVENT_ID)

    await onComposedAuthSessionObserved(event)
    await onComposedAuthSessionObserved(event)

    const [receipts, unsafeAudits] = await Promise.all([
      db.from('auth_session_event_receipts').where('event_id', event.eventId),
      db.from('audit_events').where('correlation_key', event.eventId),
    ])
    const audits = unsafeAudits as Array<{
      event_name: string
      occurred_at: Date | string
      source_occurred_at: Date | string
      schema_version: number
    }>
    assert.lengthOf(receipts, 1)
    assert.lengthOf(audits, 1)
    assert.equal(audits[0]?.event_name, 'auth.login.succeeded')
    assert.equal(new Date(audits[0]?.source_occurred_at ?? '').toISOString(), event.occurredAt)
    assert.equal(audits[0]?.schema_version, 3)
    assert.notEqual(
      new Date(audits[0]?.occurred_at ?? '').toISOString(),
      event.occurredAt,
      'database occurrence time remains the monotonic audit-chain order'
    )
  })

  test('rolls back the receipt when critical audit persistence fails', async ({ assert }) => {
    const event = makeEvent(ROLLBACK_EVENT_ID)
    const dependencies: ProcessAuthSessionObservedDependencies = {
      transactions: authSessionEvidenceTransactionRunner,
      receipts: authSessionEventReceiptRepository,
      audit: {
        write: () => Promise.reject(new Error('forced critical audit failure')),
      },
    }
    const makeCommand = (overrides: Partial<ProcessAuthSessionObservedDependencies> = {}) =>
      new ProcessAuthSessionObservedCommand({
        ...dependencies,
        ...overrides,
      })

    await assert.rejects(
      () => onAuthSessionObserved(event, makeCommand()),
      /forced critical audit failure/
    )

    const receipts = await db.from('auth_session_event_receipts').where('event_id', event.eventId)
    assert.isEmpty(receipts)

    await onAuthSessionObserved(event, makeCommand({ audit: authSessionAuditEvidenceWriter }))
    let collision: unknown
    try {
      await onAuthSessionObserved(
        {
          ...event,
          ipAddress: '198.51.100.8',
        },
        makeCommand()
      )
    } catch (error) {
      collision = error
    }
    assert.instanceOf(collision, DomainEventDeliveryError)
    if (collision instanceof DomainEventDeliveryError) {
      assert.equal(collision.errorCode, 'AUTH_SESSION_RECEIPT_COLLISION')
      assert.isFalse(collision.retryable)
    }
  })

  test('delivers through the outbox and redacts processed IP and user-agent payload', async ({
    assert,
  }) => {
    const event = makeEvent(OUTBOX_EVENT_ID)
    await authSessionObservationStager.stage(event)

    const result = await new DomainEventOutboxWorker({
      workerId: 'auth-session-evidence-integration',
      repository: new PostgresDomainEventOutboxRepository(),
      dispatcher: new AdonisDomainEventDispatcher(),
    }).runOnce()

    assert.equal(result.processed, 1)
    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'auth:session:observed:v1')
      .where('dedupe_key', event.eventId)
      .select('status', 'payload')
      .first()) as { status: string; payload: Record<string, unknown> } | undefined
    assert.exists(outbox)
    assert.equal(outbox?.status, 'processed')
    assert.deepEqual(outbox?.payload, {
      redacted: true,
      eventId: event.eventId,
      action: event.action,
      occurredAt: event.occurredAt,
    })
    assert.notInclude(JSON.stringify(outbox?.payload), event.ipAddress)
    assert.notInclude(JSON.stringify(outbox?.payload), event.userAgent)
  })
})
