
import type {
  ReviewConfirmedAccomplishmentProjectionIdentity,
  ReviewSubmittedOutboxPayload,
  TaskReviewFinalizedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

export interface ReviewSubmittedEvent extends ReviewSubmittedOutboxPayload {
  deliveryContext?: {
    signal: AbortSignal
  }
}

export interface ReviewConfirmedEvent {
  confirmationId: string
  reviewSessionId: string
  revieweeId: string
  reviewerIds: string[]
  confirmedBy: string
  action: 'confirmed' | 'disputed'
  accomplishmentProjection?: ReviewConfirmedAccomplishmentProjectionIdentity | null | undefined
  deliveryContext?: {
    signal: AbortSignal
  }
}

export interface DisputeResolvedEvent {
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
  deliveryContext?: {
    signal: AbortSignal
  }
}

export interface TaskReviewFinalizedEvent extends TaskReviewFinalizedOutboxPayload {
  deliveryContext?: {
    signal: AbortSignal
  }
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'review:submitted': ReviewSubmittedEvent
    'review:confirmed': ReviewConfirmedEvent
    'dispute:resolved': DisputeResolvedEvent
    'task-review:finalized': TaskReviewFinalizedEvent
    'reviews:talent-explainability-projection:changed:v1': TalentExplainabilityProjectionChangedV1
  }
}
