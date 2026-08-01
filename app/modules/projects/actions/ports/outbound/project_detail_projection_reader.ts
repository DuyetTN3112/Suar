export interface ProjectReviewSessionProjection {
  status: string
  deadline: string | Date | null
}

export interface ProjectReverseReviewProjection {
  id: string
  reviewer_id: string | null
  reviewer_username: string | null
  rating: number | string | null
  comment: string | null
  is_anonymous: boolean
  created_at: string | Date
}

export abstract class ProjectDetailProjectionReader {
  abstract loadReviewGovernanceRows(projectId: string): Promise<{
    sessions: ProjectReviewSessionProjection[]
    pendingAssignmentRequirements: boolean[]
  }>
  abstract listRecentReverseReviews(
    projectId: string,
    limit: number
  ): Promise<ProjectReverseReviewProjection[]>
}
