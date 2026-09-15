import {
  authSessionObservedOutboxPayloadSchema,
  disputeResolvedOutboxPayloadSchema,
  durableDomainEventInputSchema,
  type DurableDomainEventName,
  type DurableDomainEventPayloadByName,
  type DurableDomainEventStatus,
  projectContextChangedOutboxPayloadSchema,
  projectLifecycleChangedOutboxPayloadSchema,
  reviewConfirmedOutboxPayloadSchema,
  talentExplainabilityProjectionChangedOutboxPayloadSchema,
  talentReindexRequestedOutboxPayloadSchema,
  taskAssignmentCompletedOutboxPayloadSchema,
  taskReviewFinalizedOutboxPayloadSchema,
  userAccountLifecycleChangedOutboxPayloadSchema,
  userProfileChangedOutboxPayloadSchema,
  type ValidatedStageDomainEventInput,
  workPackageChangedOutboxPayloadSchema,
} from './domain_event_payload_schemas.js'

import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import { digestDomainEventCanonicalValue } from '#modules/events/public_contracts/domain_event_identity'
import type {
  AuthSessionObservedOutboxPayload,
  DurableDomainEventDeliveryContext,
  DisputeResolvedOutboxPayload,
  ProjectContextChangedOutboxPayload,
  ProjectLifecycleChangedOutboxPayload,
  WorkPackageChangedOutboxPayload,
  ReviewSubmittedOutboxPayload,
  StageDomainEventInput,
  StageDomainEventResult,
  TalentReindexRequestedOutboxPayload,
  ReviewConfirmedOutboxPayload,
  TaskReviewFinalizedOutboxPayload,
  TaskAssignmentCompletedOutboxPayload,
  TalentExplainabilityProjectionChangedOutboxPayload,
  UserAccountLifecycleChangedOutboxPayload,
  UserProfileChangedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import { reviewSubmittedOutboxPayloadSchema } from '#modules/events/public_contracts/review_submitted_outbox_protocol'

export {
  authSessionObservedOutboxPayloadSchema,
  disputeResolvedOutboxPayloadSchema,
  durableDomainEventInputSchema,
  type DurableDomainEventName,
  type DurableDomainEventPayloadByName,
  type DurableDomainEventStatus,
  projectContextChangedOutboxPayloadSchema,
  projectLifecycleChangedOutboxPayloadSchema,
  reviewConfirmedOutboxPayloadSchema,
  talentExplainabilityProjectionChangedOutboxPayloadSchema,
  talentReindexRequestedOutboxPayloadSchema,
  taskAssignmentCompletedOutboxPayloadSchema,
  taskReviewFinalizedOutboxPayloadSchema,
  userAccountLifecycleChangedOutboxPayloadSchema,
  userProfileChangedOutboxPayloadSchema,
  type ValidatedStageDomainEventInput,
  workPackageChangedOutboxPayloadSchema,
}

interface DurableDomainEventFingerprintInput {
  eventName: DurableDomainEventName
  aggregateType:
    | 'auth_session'
    | 'task_assignment'
    | 'project'
    | 'user'
    | 'review_session'
    | 'task_review_workflow'
    | 'review_dispute'
    | 'user_talent'
  aggregateId: string
  payload: unknown
}

export type {
  AuthSessionObservedOutboxPayload,
  DisputeResolvedOutboxPayload,
  ProjectLifecycleChangedOutboxPayload,
  ProjectContextChangedOutboxPayload,
  WorkPackageChangedOutboxPayload,
  ReviewSubmittedOutboxPayload,
  ReviewConfirmedOutboxPayload,
  TaskReviewFinalizedOutboxPayload,
  StageDomainEventInput,
  StageDomainEventResult,
  TaskAssignmentCompletedOutboxPayload,
  TalentExplainabilityProjectionChangedOutboxPayload,
  TalentReindexRequestedOutboxPayload,
  UserAccountLifecycleChangedOutboxPayload,
  UserProfileChangedOutboxPayload,
}

export interface DurableDomainEventJob {
  id: string
  sequence: number
  eventName: DurableDomainEventName
  eventVersion: number
  aggregateType:
    | 'auth_session'
    | 'task_assignment'
    | 'project'
    | 'user'
    | 'review_session'
    | 'task_review_workflow'
    | 'review_dispute'
    | 'user_talent'
  aggregateId: string
  payload: unknown
  dedupeFingerprint: string
  attemptCount: number
  leaseToken: string
  lockedUntil: Date
}

export interface ClaimDomainEventBatchInput {
  workerId: string
  batchSize: number
  leaseDurationMs: number
  now: Date
}

export interface DomainEventLeaseMutationInput {
  jobId: string
  leaseToken: string
  now: Date
  redactPayload?: boolean
}

export interface DomainEventHeartbeatInput extends DomainEventLeaseMutationInput {
  leaseDurationMs: number
}

export interface DomainEventRetryInput extends DomainEventLeaseMutationInput {
  availableAt: Date
  errorCode: string
}

export interface DomainEventDeadLetterInput extends DomainEventLeaseMutationInput {
  errorCode: string
}

export interface DomainEventOutboxRepository {
  stage(trx: object, input: ValidatedStageDomainEventInput): Promise<StageDomainEventResult>
  claimBatch(input: ClaimDomainEventBatchInput): Promise<DurableDomainEventJob[]>
  heartbeat(input: DomainEventHeartbeatInput): Promise<boolean>
  acknowledge(input: DomainEventLeaseMutationInput): Promise<boolean>
  retry(input: DomainEventRetryInput): Promise<boolean>
  deadLetter(input: DomainEventDeadLetterInput): Promise<boolean>
}

export interface DurableDomainEventDispatcher {
  dispatch<TEventName extends DurableDomainEventName>(
    eventName: TEventName,
    payload: DurableDomainEventPayloadByName[TEventName],
    context: DurableDomainEventDeliveryContext
  ): Promise<void>
}

export function parseStageDomainEventInput(
  input: StageDomainEventInput
): ValidatedStageDomainEventInput {
  return durableDomainEventInputSchema.parse(input)
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

export function buildDurableDomainEventFingerprint(
  input: DurableDomainEventFingerprintInput
): string {
  return digestDomainEventCanonicalValue(
    canonicalJson({
      eventName: input.eventName,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
    })
  )
}

export function parseDurableDomainEventPayload<TEventName extends DurableDomainEventName>(
  eventName: TEventName,
  payload: unknown
): DurableDomainEventPayloadByName[TEventName] {
  switch (eventName) {
    case 'auth:session:observed:v1':
      return authSessionObservedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'task:assignment:completed':
      return taskAssignmentCompletedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'project:lifecycle:changed:v1':
      return projectLifecycleChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'project:context:changed:v1':
      return projectContextChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'project:work-package:changed:v1':
      return workPackageChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'user:account:lifecycle:changed:v1':
      return userAccountLifecycleChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'user:profile:changed:v1':
      return userProfileChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'review:submitted':
      return reviewSubmittedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'review:confirmed':
      return reviewConfirmedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'task-review:finalized':
      return taskReviewFinalizedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'dispute:resolved':
      return disputeResolvedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'reviews:talent-explainability-projection:changed:v1':
      return talentExplainabilityProjectionChangedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    case 'search:talent-reindex-requested':
      return talentReindexRequestedOutboxPayloadSchema.parse(
        payload
      ) as DurableDomainEventPayloadByName[TEventName]
    default:
      return assertNever(eventName)
  }
}

export function validateDurableDomainEventEnvelope<TEventName extends DurableDomainEventName>(
  job: DurableDomainEventJob,
  payload: DurableDomainEventPayloadByName[TEventName]
): void {
  if (job.eventVersion !== 1) {
    throw new RangeError('Durable domain event version is unsupported')
  }
  const envelope = durableDomainEventInputSchema.parse({
    eventName: job.eventName,
    dedupeKey:
      job.eventName === 'auth:session:observed:v1' ||
      job.eventName === 'project:lifecycle:changed:v1' ||
      job.eventName === 'user:account:lifecycle:changed:v1' ||
      job.eventName === 'user:profile:changed:v1'
        ? (
            payload as
              | AuthSessionObservedOutboxPayload
              | ProjectLifecycleChangedOutboxPayload
              | UserAccountLifecycleChangedOutboxPayload
              | UserProfileChangedOutboxPayload
          ).eventId
        : 'persisted-envelope-validation',
    aggregateType: job.aggregateType,
    aggregateId: job.aggregateId,
    payload,
  })
  if (
    !/^[0-9a-f]{64}$/.test(job.dedupeFingerprint) ||
    job.dedupeFingerprint !== buildDurableDomainEventFingerprint(envelope)
  ) {
    throw new RangeError('Durable domain event fingerprint does not match its envelope')
  }
}

function assertNever(value: never): never {
  throw new DomainEventDeliveryError('UNSUPPORTED_DOMAIN_EVENT_NAME', false, {
    cause: value,
  })
}
