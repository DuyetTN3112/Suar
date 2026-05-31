// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import { z } from 'zod'
const DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT = 100
const uuidSchema = z.uuid()
const exactDedupeKeySchema = z.string().trim().min(1).max(255)
const domainEventOutboxAdminSelectorSchema = z
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
function normalizeDomainEventOutboxAdminSelector(selector) {
  const parsed = domainEventOutboxAdminSelectorSchema.parse(selector)
  return {
    ...(parsed.id === void 0 ? {} : { id: parsed.id }),
    ...(parsed.eventName === void 0 ? {} : { eventName: parsed.eventName }),
    ...(parsed.dedupeKey === void 0 ? {} : { dedupeKey: parsed.dedupeKey }),
  }
}
__name(normalizeDomainEventOutboxAdminSelector, 'normalizeDomainEventOutboxAdminSelector')
function requireDomainEventOutboxReplayRequest(input) {
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
__name(requireDomainEventOutboxReplayRequest, 'requireDomainEventOutboxReplayRequest')
function requireBoundedDomainEventOutboxAdminSelector(selector) {
  const normalized = normalizeDomainEventOutboxAdminSelector(selector)
  if (
    normalized.id === void 0 &&
    normalized.eventName === void 0 &&
    normalized.dedupeKey === void 0
  ) {
    throw new RangeError(
      'Domain event outbox replay requires an exact id, eventName, or dedupeKey filter'
    )
  }
  return normalized
}
__name(requireBoundedDomainEventOutboxAdminSelector, 'requireBoundedDomainEventOutboxAdminSelector')
function validateDomainEventOutboxPreviewInput(input) {
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
    input.afterSequence !== void 0 &&
    (!Number.isSafeInteger(input.afterSequence) || input.afterSequence < 1)
  ) {
    throw new RangeError('Domain event outbox afterSequence must be a positive integer')
  }
  return { ...input, selector }
}
__name(validateDomainEventOutboxPreviewInput, 'validateDomainEventOutboxPreviewInput')
export {
  DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT,
  domainEventOutboxAdminSelectorSchema,
  normalizeDomainEventOutboxAdminSelector,
  requireBoundedDomainEventOutboxAdminSelector,
  requireDomainEventOutboxReplayRequest,
  validateDomainEventOutboxPreviewInput,
}
import type { DurableDomainEventName } from './domain_event_outbox.js'

export interface DomainEventOutboxAdminSelector {
  id?: string
  eventName?: DurableDomainEventName
  dedupeKey?: string
}

export interface DomainEventOutboxDeadLetterPreviewInput {
  selector: DomainEventOutboxAdminSelector
  limit: number
  afterSequence?: number
}

export interface DomainEventOutboxDeadLetterPreviewItem {
  id: string
  sequence: number
  eventName: DurableDomainEventName
  dedupeKey: string
  aggregateType: 'task_assignment' | 'review_session' | 'review_dispute' | 'user_talent'
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
  previousStatus: string
}

export interface DomainEventOutboxReplayBatch {
  rows: DomainEventOutboxReplayRow[]
  matchedCount: number
  deferredCount: number
  hasMoreOrLocked: boolean
}
