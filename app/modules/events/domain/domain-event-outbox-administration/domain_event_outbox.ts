import { z } from 'zod'

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

const boundedIdentifier = z.string().trim().min(1).max(255)

export const authSessionObservedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    userId: boundedIdentifier,
    action: z.enum(['login', 'logout']),
    occurredAt: z.iso.datetime({ offset: true }),
    ipAddress: z.string().max(64),
    userAgent: z.string().max(1024),
    method: z.string().trim().min(1).max(64).nullable(),
    requestId: z.string().trim().min(1).max(255).nullable(),
    traceId: z.string().trim().min(1).max(255).nullable(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (
      (payload.action === 'login' && payload.method === null) ||
      (payload.action === 'logout' && payload.method !== null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['method'],
        message: 'method is required for login and must be null for logout',
      })
    }
  })

export const taskAssignmentCompletedOutboxPayloadSchema = z
  .object({
    taskId: boundedIdentifier,
    assignmentId: boundedIdentifier,
    assigneeId: boundedIdentifier,
  })
  .strict()

export const projectLifecycleChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    action: z.enum(['created', 'updated', 'deleted']),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    actorId: boundedIdentifier,
    projectName: z.string().trim().min(1).max(255).nullable(),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((payload, context) => {
    if (
      (payload.action === 'created' && payload.projectName === null) ||
      (payload.action !== 'created' && payload.projectName !== null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['projectName'],
        message: 'projectName is required only for created lifecycle events',
      })
    }
  })

export const projectContextChangedOutboxPayloadSchema = z
  .object({
    schemaVersion: z.literal('suar.project_context_changed.v1'),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    previousVersionId: boundedIdentifier.nullable(),
    activeVersionId: boundedIdentifier,
    activeVersionNumber: z.number().int().positive(),
    versionToken: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const workPackageChangedOutboxPayloadSchema = z
  .object({
    schemaVersion: z.literal('suar.work_package_changed.v1'),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    workPackageId: boundedIdentifier,
    activeVersionId: boundedIdentifier,
    activeVersionNumber: z.number().int().positive(),
    versionToken: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const userAccountLifecycleChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    action: z.enum([
      'registered',
      'deactivated',
      'deleted',
      'suspended',
      'activated',
    ]),
    userId: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

const userProfileChangedField = z.enum([
  'username',
  'email',
  'avatar_url',
  'bio',
  'phone',
  'address',
  'timezone',
  'language',
  'is_external_contributor',
])

export const userProfileChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    userId: boundedIdentifier,
    actorId: boundedIdentifier,
    changedFields: z
      .array(userProfileChangedField)
      .min(1)
      .max(32)
      .refine((fields) => new Set(fields).size === fields.length, {
        message: 'changedFields must not contain duplicates',
      })
      .refine(
        (fields) =>
          fields.every(
            (field, index) =>
              index === 0 ||
              (fields[index - 1] ?? '').localeCompare(field) < 0
          ),
        { message: 'changedFields must be in canonical ascending order' }
      ),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const reviewConfirmedOutboxPayloadSchema = z
  .object({
    confirmationId: boundedIdentifier,
    reviewSessionId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    reviewerIds: z
      .array(boundedIdentifier)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'reviewerIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        {
          message: 'reviewerIds must be in canonical ascending order',
        }
      ),
    confirmedBy: boundedIdentifier,
    action: z.enum(['confirmed', 'disputed']),
    accomplishmentProjection: z
      .object({
        reviewWorkflowId: boundedIdentifier,
        completionClaimId: boundedIdentifier,
        reviewFinalizedFactId: boundedIdentifier,
        reviewFinalizedFactHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
        projectionPolicyVersion: boundedIdentifier,
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()

export const taskReviewFinalizedOutboxPayloadSchema = z
  .object({
    workflowId: boundedIdentifier,
    taskAssignmentId: boundedIdentifier,
    taskId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    finalizedBy: boundedIdentifier,
    finalizationSource: z.enum(['consensus', 'admin_resolution', 'organization_governance']),
    finalizedAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const disputeResolvedOutboxPayloadSchema = z
  .object({
    disputeId: boundedIdentifier,
    reviewSessionId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    reviewerIds: z
      .array(boundedIdentifier)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'reviewerIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        { message: 'reviewerIds must be in canonical ascending order' }
      ),
    resolvedBy: boundedIdentifier,
    finalDecision: z.enum([
      'uphold_review',
      'adjust_score',
      'request_re_review',
      'dismiss_dispute',
      'partially_accept',
    ]),
    profileUpdateAction: z
      .enum(['recalculate_after_adjustment', 'no_action'])
      .nullable()
      .optional(),
    reviewerCredibilityAction: z.enum(['mark_disputed_review', 'no_action']).nullable().optional(),
  })
  .strict()

export const talentReindexRequestedOutboxPayloadSchema = z
  .object({
    userId: boundedIdentifier,
    sourceEventName: z.enum([
      'review:submitted',
      'review:confirmed',
      'dispute:resolved',
      'reviews:talent-explainability-projection:changed:v1',
      'accomplishment:publication:changed:v1',
    ]),
    sourceEventId: boundedIdentifier,
  })
  .strict()

export const talentExplainabilityProjectionChangedOutboxPayloadSchema = z
  .object({
    contractVersion: z.literal(1),
    eventType: z.literal('reviews.talent_explainability_projection_changed.v1'),
    revieweeUserId: boundedIdentifier,
    underDisputeSkillsCount: z.number().int().nonnegative(),
    latestConfidenceSignal: z.enum(['low', 'medium', 'high']).nullable(),
    sourceRevision: z.string().regex(/^\d+$/).max(255),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const durableDomainEventInputSchema = z
  .discriminatedUnion('eventName', [
    z
      .object({
        eventName: z.literal('auth:session:observed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('auth_session'),
        aggregateId: boundedIdentifier,
        payload: authSessionObservedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('task:assignment:completed'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('task_assignment'),
        aggregateId: boundedIdentifier,
        payload: taskAssignmentCompletedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:lifecycle:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: projectLifecycleChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:context:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: projectContextChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:work-package:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: workPackageChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('user:account:lifecycle:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user'),
        aggregateId: boundedIdentifier,
        payload: userAccountLifecycleChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('user:profile:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user'),
        aggregateId: boundedIdentifier,
        payload: userProfileChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('review:submitted'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_session'),
        aggregateId: boundedIdentifier,
        payload: reviewSubmittedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('review:confirmed'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_session'),
        aggregateId: boundedIdentifier,
        payload: reviewConfirmedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('task-review:finalized'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('task_review_workflow'),
        aggregateId: boundedIdentifier,
        payload: taskReviewFinalizedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('dispute:resolved'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_dispute'),
        aggregateId: boundedIdentifier,
        payload: disputeResolvedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal(
          'reviews:talent-explainability-projection:changed:v1'
        ),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user_talent'),
        aggregateId: boundedIdentifier,
        payload: talentExplainabilityProjectionChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('search:talent-reindex-requested'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user_talent'),
        aggregateId: boundedIdentifier,
        payload: talentReindexRequestedOutboxPayloadSchema,
      })
      .strict(),
  ])
  .superRefine((input, context) => {
    const payloadAggregateId = (() => {
      switch (input.eventName) {
        case 'auth:session:observed:v1':
          return input.payload.userId
        case 'task:assignment:completed':
          return input.payload.assignmentId
        case 'project:lifecycle:changed:v1':
        case 'project:context:changed:v1':
        case 'project:work-package:changed:v1':
          return input.payload.projectId
        case 'user:account:lifecycle:changed:v1':
        case 'user:profile:changed:v1':
          return input.payload.userId
        case 'review:submitted':
          return input.payload.reviewSessionId
        case 'review:confirmed':
          return input.payload.reviewSessionId
        case 'task-review:finalized':
          return input.payload.workflowId
        case 'dispute:resolved':
          return input.payload.disputeId
        case 'reviews:talent-explainability-projection:changed:v1':
          return input.payload.revieweeUserId
        case 'search:talent-reindex-requested':
          return input.payload.userId
      }
    })()
    if (input.aggregateId !== payloadAggregateId) {
      context.addIssue({
        code: 'custom',
        path: ['aggregateId'],
        message: 'aggregateId must match the aggregate identity in the event payload',
      })
    }
    if (
      (input.eventName === 'auth:session:observed:v1' ||
        input.eventName === 'project:lifecycle:changed:v1' ||
        input.eventName === 'user:account:lifecycle:changed:v1' ||
        input.eventName === 'user:profile:changed:v1') &&
      input.dedupeKey !== input.payload.eventId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dedupeKey'],
        message: 'dedupeKey must match the payload eventId',
      })
    }
  })

export interface DurableDomainEventPayloadByName {
  'auth:session:observed:v1': AuthSessionObservedOutboxPayload
  'task:assignment:completed': TaskAssignmentCompletedOutboxPayload
  'project:lifecycle:changed:v1': ProjectLifecycleChangedOutboxPayload
  'project:context:changed:v1': ProjectContextChangedOutboxPayload
  'project:work-package:changed:v1': WorkPackageChangedOutboxPayload
  'user:account:lifecycle:changed:v1': UserAccountLifecycleChangedOutboxPayload
  'user:profile:changed:v1': UserProfileChangedOutboxPayload
  'review:submitted': ReviewSubmittedOutboxPayload
  'review:confirmed': ReviewConfirmedOutboxPayload
  'task-review:finalized': TaskReviewFinalizedOutboxPayload
  'dispute:resolved': DisputeResolvedOutboxPayload
  'reviews:talent-explainability-projection:changed:v1': TalentExplainabilityProjectionChangedOutboxPayload
  'search:talent-reindex-requested': TalentReindexRequestedOutboxPayload
}

export type DurableDomainEventName = keyof DurableDomainEventPayloadByName
export type DurableDomainEventStatus = 'pending' | 'leased' | 'processed' | 'dead_letter'
export type ValidatedStageDomainEventInput = z.output<typeof durableDomainEventInputSchema>
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
