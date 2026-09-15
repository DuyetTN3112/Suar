import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  DurableDomainEventJob,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

export const BASE_TIME = new Date('2030-07-26T12:00:00.000Z')

export interface OutboxStateRow {
  status: string
  last_error_code: string | null
  processed_at: Date | null
  dead_lettered_at: Date | null
}

export interface OutboxPayloadRow {
  payload: unknown
}

export interface OutboxLeaseRow {
  locked_until: Date
}

export function requireJob(job: DurableDomainEventJob | undefined): DurableDomainEventJob {
  if (!job) {
    throw new Error('Expected the outbox repository to return one claimed job')
  }
  return job
}

export function eventInput(overrides: {
  dedupeKey?: string
  taskId?: string
  assignmentId?: string
  assigneeId?: string
} = {}) {
  const assignmentId = overrides.assignmentId ?? randomUUID()
  return {
    eventName: 'task:assignment:completed' as const,
    dedupeKey: overrides.dedupeKey ?? `task-assignment-completed:${assignmentId}`,
    aggregateType: 'task_assignment' as const,
    aggregateId: assignmentId,
    payload: {
      taskId: overrides.taskId ?? randomUUID(),
      assignmentId,
      assigneeId: overrides.assigneeId ?? randomUUID(),
    },
  }
}

export function reviewConfirmedEventInput() {
  const reviewSessionId = randomUUID()
  const revieweeId = randomUUID()
  const confirmationId = `review-confirmed:${reviewSessionId}:${revieweeId}`
  return {
    eventName: 'review:confirmed' as const,
    dedupeKey: confirmationId,
    aggregateType: 'review_session' as const,
    aggregateId: reviewSessionId,
    payload: {
      confirmationId,
      reviewSessionId,
      revieweeId,
      action: 'confirmed' as const,
      reviewerIds: [randomUUID(), randomUUID()].sort(),
      confirmedBy: revieweeId,
    },
  }
}

export async function cleanOutbox(): Promise<void> {
  await db.from('domain_event_outbox').delete()
}

export async function setupOutboxTestGroup(): Promise<void> {
  await setupApp()
  await assertSafeTestDatastores()
  await cleanOutbox()
}

export async function teardownOutboxTestGroup(): Promise<void> {
  await cleanOutbox()
  await teardownApp()
}
