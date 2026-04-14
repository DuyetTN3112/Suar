import { z } from 'zod'

import type { DurableDomainEventName } from '#modules/events/domain/domain_event_outbox'

export const DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT = 100

const uuidSchema = z.uuid()
const exactDedupeKeySchema = z.string().trim().min(1).max(255)

export const domainEventOutboxAdminSelectorSchema = z
  .object({
    id: uuidSchema.optional(),
    eventName: z
      .enum([
        'task:assignment:completed',
        'review:submitted',
        'review:confirmed',
        'dispute:resolved',
        'reviews:talent-explainability-projection:changed:v1',
        'search:talent-reindex-requested',
      ])
      .optional(),
    dedupeKey: exactDedupeKeySchema.optional(),
  })
  .strict()

export interface DomainEventOutboxAdminSelector {
  id?: string
  eventName?: DurableDomainEventName
  dedupeKey?: string
}

export interface DomainEventOutboxDeadLetterPreviewInput {
  selector: DomainEventOutboxAdminSelector
  afterSequence?: number
  limit: number
}

export interface DomainEventOutboxDeadLetterPreviewItem {
  id: string
  sequence: number
  eventName: DurableDomainEventName
  dedupeKey: string
  aggregateType:
    | 'task_assignment'
    | 'review_session'
    | 'review_dispute'
    | 'user_talent'
  aggregateId: string
  attemptCount: number
  lifetimeAttemptCount: number
  replayCount: number
  errorCode: string
  deadLetteredAt: Date
}

export interface DomainEventOutboxDeadLetterPreviewPage {
  items: DomainEventOutboxDeadLetterPreviewItem[]
  hasMore: boolean
  nextAfterSequence: number | null
}

export interface DomainEventOutboxReplayInput {
  selector: DomainEventOutboxAdminSelector
  actorId: string
  reasonDigest: string
  reasonLength: number
  now: Date
}

export interface DomainEventOutboxReplayRow {
  id: string
  sequence: number
  eventName: DurableDomainEventName
  previousAttemptCount: number
  lifetimeAttemptCount: number
  replayCount: number
  previousStatus: 'dead_letter'
}

export interface DomainEventOutboxReplayBatch {
  rows: DomainEventOutboxReplayRow[]
  matchedCount: number
  deferredCount: number
  hasMoreOrLocked: boolean
}

export function normalizeDomainEventOutboxAdminSelector(
  selector: DomainEventOutboxAdminSelector
): DomainEventOutboxAdminSelector {
  const parsed = domainEventOutboxAdminSelectorSchema.parse(selector)
  return {
    ...(parsed.id === undefined ? {} : { id: parsed.id }),
    ...(parsed.eventName === undefined ? {} : { eventName: parsed.eventName }),
    ...(parsed.dedupeKey === undefined ? {} : { dedupeKey: parsed.dedupeKey }),
  }
}

export function requireDomainEventOutboxReplayRequest(input: {
  selector: DomainEventOutboxAdminSelector
  reason: string
  confirmation: string
  now: Date
}): {
  selector: DomainEventOutboxAdminSelector
  reason: string
  now: Date
} {
  if (input.confirmation !== 'REPLAY') {
    throw new RangeError('Domain event outbox replay requires confirmation=REPLAY')
  }
  const selector = requireBoundedDomainEventOutboxAdminSelector(input.selector)
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new RangeError('Domain event outbox replay reason must contain 10 to 500 characters')
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new RangeError('Domain event outbox replay time must be valid')
  }
  return { selector, reason, now: input.now }
}

export function requireBoundedDomainEventOutboxAdminSelector(
  selector: DomainEventOutboxAdminSelector
): DomainEventOutboxAdminSelector {
  const normalized = normalizeDomainEventOutboxAdminSelector(selector)
  if (
    normalized.id === undefined &&
    normalized.eventName === undefined &&
    normalized.dedupeKey === undefined
  ) {
    throw new RangeError(
      'Domain event outbox replay requires an exact id, eventName, or dedupeKey filter'
    )
  }
  return normalized
}

export function validateDomainEventOutboxPreviewInput(
  input: DomainEventOutboxDeadLetterPreviewInput
): DomainEventOutboxDeadLetterPreviewInput {
  const selector = normalizeDomainEventOutboxAdminSelector(input.selector)
  if (
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT
  ) {
    throw new RangeError(
      `Domain event outbox preview limit must be between 1 and ${DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT}`
    )
  }
  if (
    input.afterSequence !== undefined &&
    (!Number.isSafeInteger(input.afterSequence) || input.afterSequence < 1)
  ) {
    throw new RangeError('Domain event outbox afterSequence must be a positive integer')
  }
  return { ...input, selector }
}
