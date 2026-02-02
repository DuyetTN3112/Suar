import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface AuthSessionObservedOutboxPayload {
  eventId: string
  userId: string
  action: 'login' | 'logout'
  occurredAt: string
  ipAddress: string
  userAgent: string
  method: string | null
  requestId: string | null
  traceId: string | null
}

export interface DurableDomainEventDeliveryContext {
  signal: AbortSignal
  sequence: number
}

export interface AuthSessionObservedEvent extends AuthSessionObservedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface TaskAssignmentCompletedOutboxPayload {
  taskId: string
  assignmentId: string
  assigneeId: string
}

export interface ProjectLifecycleChangedOutboxPayload {
  eventId: string
  action: 'created' | 'updated' | 'deleted'
  projectId: string
  organizationId: string
  actorId: string
  projectName: string | null
  occurredAt: string
}

export interface ProjectLifecycleChangedEvent
  extends ProjectLifecycleChangedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface UserAccountLifecycleChangedOutboxPayload {
  eventId: string
  action: 'registered' | 'deactivated' | 'deleted' | 'suspended' | 'activated'
  userId: string
  actorId: string
  occurredAt: string
}

export interface UserAccountLifecycleChangedEvent
  extends UserAccountLifecycleChangedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface UserProfileChangedOutboxPayload {
  eventId: string
  userId: string
  actorId: string
  changedFields: string[]
  occurredAt: string
}

export interface UserProfileChangedEvent extends UserProfileChangedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface ReviewConfirmedOutboxPayload {
  confirmationId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  confirmedBy: string
  action: 'confirmed' | 'disputed'
}

export interface DisputeResolvedOutboxPayload {
  disputeId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  resolvedBy: string
  finalDecision:
    | 'uphold_review'
    | 'adjust_score'
    | 'request_re_review'
    | 'dismiss_dispute'
    | 'partially_accept'
  profileUpdateAction?: 'recalculate_after_adjustment' | 'no_action' | null | undefined
  reviewerCredibilityAction?: 'mark_disputed_review' | 'no_action' | null | undefined
}

export interface ReviewSubmittedOutboxPayload {
  submissionId: string
  reviewSessionId: string
  reviewerAssignmentId: string
  reviewerId: string
  reviewerType: 'manager' | 'peer'
  revieweeId: string
  taskId: string
  skillReviewIds: string[]
  submittedAt: string
}

export interface TalentReindexRequestedOutboxPayload {
  userId: string
  sourceEventName:
    | 'review:submitted'
    | 'review:confirmed'
    | 'dispute:resolved'
    | 'reviews:talent-explainability-projection:changed:v1'
  sourceEventId: string
}

export interface TalentReindexRequestedEvent
  extends TalentReindexRequestedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface TalentExplainabilityProjectionChangedOutboxPayload {
  contractVersion: 1
  eventType: 'reviews.talent_explainability_projection_changed.v1'
  revieweeUserId: string
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
  sourceRevision: string
  occurredAt: string
}

export type StageDomainEventInput =
  | {
      eventName: 'auth:session:observed:v1'
      dedupeKey: string
      aggregateType: 'auth_session'
      aggregateId: string
      payload: AuthSessionObservedOutboxPayload
    }
  | {
      eventName: 'task:assignment:completed'
      dedupeKey: string
      aggregateType: 'task_assignment'
      aggregateId: string
      payload: TaskAssignmentCompletedOutboxPayload
    }
  | {
      eventName: 'project:lifecycle:changed:v1'
      dedupeKey: string
      aggregateType: 'project'
      aggregateId: string
      payload: ProjectLifecycleChangedOutboxPayload
    }
  | {
      eventName: 'user:account:lifecycle:changed:v1'
      dedupeKey: string
      aggregateType: 'user'
      aggregateId: string
      payload: UserAccountLifecycleChangedOutboxPayload
    }
  | {
      eventName: 'user:profile:changed:v1'
      dedupeKey: string
      aggregateType: 'user'
      aggregateId: string
      payload: UserProfileChangedOutboxPayload
    }
  | {
      eventName: 'review:submitted'
      dedupeKey: string
      aggregateType: 'review_session'
      aggregateId: string
      payload: ReviewSubmittedOutboxPayload
    }
  | {
      eventName: 'review:confirmed'
      dedupeKey: string
      aggregateType: 'review_session'
      aggregateId: string
      payload: ReviewConfirmedOutboxPayload
    }
  | {
      eventName: 'dispute:resolved'
      dedupeKey: string
      aggregateType: 'review_dispute'
      aggregateId: string
      payload: DisputeResolvedOutboxPayload
    }
  | {
      eventName: 'reviews:talent-explainability-projection:changed:v1'
      dedupeKey: string
      aggregateType: 'user_talent'
      aggregateId: string
      payload: TalentExplainabilityProjectionChangedOutboxPayload
    }
  | {
      eventName: 'search:talent-reindex-requested'
      dedupeKey: string
      aggregateType: 'user_talent'
      aggregateId: string
      payload: TalentReindexRequestedOutboxPayload
    }

export interface StageDomainEventResult {
  id: string
  staged: boolean
}

export interface DomainEventStager {
  stage(trx: object, input: StageDomainEventInput): Promise<StageDomainEventResult>
}

let registeredStager: DomainEventStager | undefined

/**
 * Composition-root hook. Registration is intentionally single-assignment so
 * production behavior cannot be replaced after listeners start processing.
 */
export function registerDomainEventStager(stager: DomainEventStager): void {
  if (registeredStager && registeredStager !== stager) {
    throw new InvariantViolationException('Domain event stager is already registered')
  }
  registeredStager = stager
}

/**
 * Stages an event on the caller-owned transaction. The implementation is
 * registered during application boot and this boundary fails closed if boot
 * composition is incomplete.
 */
export function stageDomainEvent(
  trx: object,
  input: StageDomainEventInput
): Promise<StageDomainEventResult> {
  if (!registeredStager) {
    throw new InvariantViolationException('Domain event stager is not registered')
  }
  return registeredStager.stage(trx, input)
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'auth:session:observed:v1': AuthSessionObservedEvent
    'project:lifecycle:changed:v1': ProjectLifecycleChangedEvent
    'user:account:lifecycle:changed:v1': UserAccountLifecycleChangedEvent
    'user:profile:changed:v1': UserProfileChangedEvent
    'search:talent-reindex-requested': TalentReindexRequestedEvent
  }
}
