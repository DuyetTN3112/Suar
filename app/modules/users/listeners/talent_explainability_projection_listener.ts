import type loggerService from '#modules/logger/public_contracts/application_logger'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'
import type { UserTalentExplainabilityProjectionV1 } from '#modules/users/types/user_profile_data'

export interface TalentExplainabilityProjectionListenerDependencies {
  apply(userId: string, projection: UserTalentExplainabilityProjectionV1): Promise<boolean | void>
  stageSearchReindex(event: TalentExplainabilityProjectionChangedV1): Promise<void>
  logger: Pick<typeof loggerService, 'error'>
}

export async function handleTalentExplainabilityProjectionChanged(
  event: TalentExplainabilityProjectionChangedV1,
  dependencies: TalentExplainabilityProjectionListenerDependencies
): Promise<void> {
  try {
    event.deliveryContext?.signal.throwIfAborted()
    await dependencies.apply(event.revieweeUserId, {
      contract_version: 1,
      under_dispute_skills_count: event.underDisputeSkillsCount,
      latest_confidence_signal: event.latestConfidenceSignal,
      source_revision: event.sourceRevision,
      projected_at: event.occurredAt,
    })
    event.deliveryContext?.signal.throwIfAborted()
    await dependencies.stageSearchReindex(event)
  } catch (error) {
    try {
      dependencies.logger.error('Talent explainability projection update failed', {
        revieweeUserId: event.revieweeUserId,
        sourceRevision: event.sourceRevision,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not replace the projection failure.
    }
    throw error
  }
}
