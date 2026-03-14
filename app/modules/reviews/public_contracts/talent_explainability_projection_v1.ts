export type TalentConfidenceSignalV1 = 'low' | 'medium' | 'high'

export interface TalentExplainabilityReviewProjectionV1 {
  contractVersion: 1
  revieweeUserId: string
  underDisputeSkillsCount: number
  latestConfidenceSignal: TalentConfidenceSignalV1 | null
  sourceRevision: string
}

export interface TalentExplainabilityProjectionChangedV1
  extends TalentExplainabilityReviewProjectionV1 {
  eventType: 'reviews.talent_explainability_projection_changed.v1'
  occurredAt: string
  deliveryContext?: {
    signal: AbortSignal
  }
}
