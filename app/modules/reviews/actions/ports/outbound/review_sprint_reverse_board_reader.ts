import type {
  SprintReverseReviewStatus,
  SprintReverseReviewTargetType,
} from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'

export interface ReviewSprintReverseWorkflowSource {
  id: string
  sprint_id: string
  project_id: string
  organization_id: string
  reviewer_id: string
  target_type: SprintReverseReviewTargetType
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
  status: SprintReverseReviewStatus
  rating: number | null
  comment: string | null
  updated_at: string
  reviewer_username: string | null
  reviewer_email: string | null
  target_username: string | null
  target_email: string | null
  responder_username: string | null
  responder_email: string | null
}

export interface ReviewSprintReverseRelatedTaskSource {
  id: string
  title: string
  status: string
  assigned_to: string | null
}

export interface ReviewSprintReverseBoardReader {
  listWorkflows(
    sprintId: string,
    actorId: string
  ): Promise<ReviewSprintReverseWorkflowSource[]>

  listRelatedTasks(input: {
    sprintId: string
    projectId: string
    reviewerId: string
    targetUserId: string
  }): Promise<ReviewSprintReverseRelatedTaskSource[]>
}
