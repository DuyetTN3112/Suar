import type { ProjectVisibility } from './project_constants.js'

export interface ProjectMembershipHistoryFact {
  project_name: string
  organization_id: string
  project_role: string
  start_date: Date | string | null
  end_date: Date | string | null
  visibility: ProjectVisibility
}
