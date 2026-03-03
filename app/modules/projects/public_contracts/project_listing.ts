import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'

export interface GetProjectsListDTO {
  page?: number
  limit?: number
  organization_id?: string
  status?: string
  creator_id?: string
  manager_id?: string
  visibility?: ProjectVisibility
  search?: string
  sort_by?: 'created_at' | 'name' | 'start_date' | 'end_date'
  sort_order?: 'asc' | 'desc'
  allow_external_contributors?: boolean
  start_date_start?: string
  start_date_end?: string
  end_date_start?: string
  end_date_end?: string
  created_at_start?: string
  created_at_end?: string
}

export interface GetProjectsListResult {
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: GetProjectsListDTO
  stats: {
    total_projects: number
    active_projects: number
    completed_projects: number
  }
}

export interface ProjectListingCapability {
  list(input: GetProjectsListDTO, execCtx: HttpActionContext): Promise<GetProjectsListResult>
}
