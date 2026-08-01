export interface SelfAssessmentAccuracyPeriodV1 {
  periodStart?: string | null
  periodEnd?: string | null
}

export interface SelfAssessmentAccuracyFactV1 {
  taskAssignmentId: string
  selfScore: number
  reviewedScore: number
  reviewCompletedAt: string
}
