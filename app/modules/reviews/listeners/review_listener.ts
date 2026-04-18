import type {
  DisputeResolvedEvent,
  ReviewConfirmedEvent,
  ReviewSubmittedEvent,
} from '#modules/reviews/events/review_events'
import type { SkillScoreUpdatedEvent } from '#modules/skills/public_contracts/skill_events'

interface ReviewEventDeliveryContext {
  signal?: AbortSignal
}

export interface ReviewListenerLogger {
  debug(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface ReviewListenerDependencies {
  processReviewSubmitted(
    event: ReviewSubmittedEvent,
    context: ReviewEventDeliveryContext
  ): Promise<void>
  processReviewConfirmed(
    event: ReviewConfirmedEvent,
    context: ReviewEventDeliveryContext
  ): Promise<void>
  processDisputeResolved(
    event: DisputeResolvedEvent,
    context: ReviewEventDeliveryContext
  ): Promise<void>
  processSkillScoreUpdated(event: SkillScoreUpdatedEvent): Promise<void>
  logger: ReviewListenerLogger
}

function reportListenerFailureSafely(
  dependencies: ReviewListenerDependencies,
  message: string,
  context: Record<string, unknown>,
  error: unknown
): void {
  try {
    dependencies.logger.error(message, {
      ...context,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
  } catch {
    // Telemetry failure must not replace the listener failure.
  }
}

export async function handleReviewSubmitted(
  event: ReviewSubmittedEvent,
  dependencies: ReviewListenerDependencies
): Promise<void> {
  try {
    await dependencies.processReviewSubmitted(event, event.deliveryContext ?? {})

    dependencies.logger.debug('Review submitted durable pipeline executed', {
      submissionId: event.submissionId,
      reviewSessionId: event.reviewSessionId,
      revieweeId: event.revieweeId,
      reviewerId: event.reviewerId,
      skillReviewCount: event.skillReviewIds.length,
    })
  } catch (error) {
    reportListenerFailureSafely(
      dependencies,
      'ReviewListener: review submitted failed',
      { reviewSessionId: event.reviewSessionId },
      error
    )
    throw error
  }
}

export async function handleReviewConfirmed(
  event: ReviewConfirmedEvent,
  dependencies: ReviewListenerDependencies
): Promise<void> {
  try {
    await dependencies.processReviewConfirmed(event, event.deliveryContext ?? {})

    dependencies.logger.debug('Review confirmed pipeline executed', {
      confirmationId: event.confirmationId,
      revieweeId: event.revieweeId,
      reviewerCount: event.reviewerIds.length,
      action: event.action,
    })
  } catch (error) {
    reportListenerFailureSafely(
      dependencies,
      'ReviewListener: review confirmed failed',
      { confirmationId: event.confirmationId },
      error
    )
    throw error
  }
}

export async function handleDisputeResolved(
  event: DisputeResolvedEvent,
  dependencies: ReviewListenerDependencies
): Promise<void> {
  try {
    await dependencies.processDisputeResolved(event, event.deliveryContext ?? {})

    dependencies.logger.debug('Dispute resolved pipeline executed', {
      disputeId: event.disputeId,
      revieweeId: event.revieweeId,
      reviewerCount: event.reviewerIds.length,
      finalDecision: event.finalDecision,
    })
  } catch (error) {
    reportListenerFailureSafely(
      dependencies,
      'ReviewListener: dispute resolved failed',
      { disputeId: event.disputeId },
      error
    )
    throw error
  }
}

export async function handleReviewSkillScoreUpdated(
  event: SkillScoreUpdatedEvent,
  dependencies: ReviewListenerDependencies
): Promise<void> {
  try {
    await dependencies.processSkillScoreUpdated(event)

    dependencies.logger.debug('Skill score updated — cache invalidated', {
      userId: event.userId,
      skillId: event.skillId,
      oldScore: event.oldScore,
      newScore: event.newScore,
    })
  } catch (error) {
    reportListenerFailureSafely(
      dependencies,
      'ReviewListener: skill score updated failed',
      { userId: event.userId },
      error
    )
    throw error
  }
}
