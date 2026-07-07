import type { SprintReverseReviewTargetType } from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'

export interface SprintReverseReviewWorkflowOutcome {
  id: string
  status: string
  sprintId: string
  projectId: string
  targetType: SprintReverseReviewTargetType
}
