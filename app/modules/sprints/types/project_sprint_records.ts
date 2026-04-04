import type { ProjectSprintCoreStatus } from '#modules/sprints/domain/sprint_core_rules'

export interface ProjectSprintRecord {
  id: string
  organization_id: string
  project_id: string
  name: string
  goal: string | null
  status: ProjectSprintCoreStatus
  starts_at: string
  ends_at: string
  created_by: string
  closed_by: string | null
  review_opened_at: string | null
  review_closed_at: string | null
  reverse_review_pending_count?: number | string
  reverse_review_assigner_pending_count?: number | string
  reverse_review_environment_pending_count?: number | string
  created_at: string
  updated_at: string
}
