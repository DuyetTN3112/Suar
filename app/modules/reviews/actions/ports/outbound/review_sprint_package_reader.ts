export interface ReviewSprintPackageListRow {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  submitted_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  sprint_name: string
  sprint_starts_at: string | Date
  sprint_ends_at: string | Date
  project_id: string
  project_name: string
  organization_id: string
}

export interface ReviewSprintPackagePage {
  rows: ReviewSprintPackageListRow[]
  total: number
}

export interface ReviewSprintPackageDetailSource {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  sprint_name: string
  project_id: string
  project_name: string
  organization_id: string
  organization_name: string
  owner_id: string | null
  manager_id: string | null
}

export interface ReviewSprintManagerReviewSource {
  id: string
  target_user_id: string
  target_role: string
  rating: number
  dimensions: unknown
  comment: string | null
  is_anonymous_to_target: boolean
  created_at: string
}

export interface ReviewSprintEnvironmentReviewSource {
  id: string
  target_type: string
  target_id: string
  rating: number
  dimensions: unknown
  comment: string | null
  is_anonymous_publicly: boolean
  created_at: string
}

export interface ReviewSprintManagerEvidenceSource {
  user_id: string
  assigned_task_count: number | string
  created_task_count: number | string
}

export interface ReviewSprintPackageDisputeSource {
  id: string
  package_id: string
  status: string
  dispute_reason: string
  requested_outcome: string
  reported_to_admin_at: string | null
  comments: Array<{
    id: string
    author_id: string
    body: string
    created_at: string
  }>
}

export interface ReviewSprintPackageReader {
  listForReviewer(
    reviewerId: string,
    pagination: { page: number; perPage: number }
  ): Promise<ReviewSprintPackagePage>

  listPendingForReviewer(
    reviewerId: string,
    pagination: { page: number; perPage: number }
  ): Promise<ReviewSprintPackagePage>

  findDetail(packageId: string): Promise<ReviewSprintPackageDetailSource | null>

  listManagerReviews(packageId: string): Promise<ReviewSprintManagerReviewSource[]>

  listEnvironmentReviews(packageId: string): Promise<ReviewSprintEnvironmentReviewSource[]>

  listManagerEvidence(projectId: string): Promise<ReviewSprintManagerEvidenceSource[]>

  findDispute(packageId: string): Promise<ReviewSprintPackageDisputeSource | null>
}
