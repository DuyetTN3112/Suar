export type UserWorkHistoryViewerScope = 'self' | 'public'

export interface UserOrganizationMembershipHistorySource {
  organization_id: string
  organization_name: string
  org_role: string
  joined_at: Date | string
  status: string
}

export interface UserProjectMembershipHistorySource {
  project_name: string
  organization_id: string
  project_role: string
  start_date: Date | string | null
  end_date: Date | string | null
  visibility: string
}

export interface UserOrganizationNameSource {
  id: string
  name: string
}

export interface UserDemonstratedWorkSource {
  task_assignment_id: string
  task_id: string
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  collaboration_type: string | null
  difficulty: string | null
  overall_quality_score: number | null
  was_on_time: boolean | null
  completed_at: Date | string | null
  /** Storage facts; application queries decide viewer visibility. */
  is_public?: boolean
}

export interface UserVerifiedDemonstratedWorkSource {
  accomplishment_id: string
  task_assignment_id: string
  task_id: string
  title: string
  concise_statement: string
  action: string
  object: string
  role: string | null
  ownership_level: string
  autonomy_level: string | null
  business_domain: string | null
  problem_category: string | null
  collaboration_type: string | null
  environment: string | null
  scale_summary: string | null
  verification_method: string
  confidence_band: 'low' | 'medium' | 'high'
  evidence_sufficiency: 'pending' | 'adequate' | 'governed_exception' | 'inadequate'
  verified_at: Date | string | null
  /** Storage facts; application queries decide lifecycle/visibility eligibility. */
  lifecycle_state?: string
  visibility?: string
}

/**
 * A distinct, attributable profile input. It is not a canonical verified
 * accomplishment and must be shown with its own verification label.
 */
export interface UserAdminApprovedAiDemonstratedWorkSource {
  approval_id: string
  task_assignment_id: string
  task_id: string
  title: string
  concise_statement: string
  action: string
  object: string
  ownership_level: string | null
  context_summary: string | null
  outcome_summary: string | null
  capability_proposals: Array<{
    capability_name: string
    approved_observed_level: string
    declared_minimum_level?: string | null
    assessed_task_difficulty_level?: string | null
  }>
  approved_at: Date | string
  /** Storage fact; application queries decide the viewer boundary. */
  is_public?: boolean
}

export abstract class UserWorkHistoryReader {
  abstract listOrganizationMemberships(
    userId: string
  ): Promise<UserOrganizationMembershipHistorySource[]>

  abstract listProjectMemberships(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserProjectMembershipHistorySource[]>

  abstract listOrganizationNamesByIds(
    organizationIds: string[]
  ): Promise<UserOrganizationNameSource[]>

  abstract listDemonstratedWork(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserDemonstratedWorkSource[]>

  abstract listVerifiedDemonstratedWork(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserVerifiedDemonstratedWorkSource[]>

  abstract listAdminApprovedAiDemonstratedWork(
    userId: string,
    viewerScope: UserWorkHistoryViewerScope
  ): Promise<UserAdminApprovedAiDemonstratedWorkSource[]>

  /** Storage facts for the public projection boundary; policy stays in the query. */
  abstract listActivePublicAccomplishmentIds(userId: string): Promise<readonly string[]>
}
