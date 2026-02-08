export interface ProjectAccessListFilters {
  page?: number
  limit?: number
  project_ids?: string[]
  organization_id?: string
  status?: string
  creator_id?: string
  manager_id?: string
  visibility?: 'public' | 'private' | 'team'
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  allow_external_contributors?: boolean
  start_date_start?: string
  start_date_end?: string
  end_date_start?: string
  end_date_end?: string
  created_at_start?: string
  created_at_end?: string
}

export interface ProjectListRecord {
  id: string
  name: string
  description: string | null
  organization_id: string | null
  start_date: Date | null
  end_date: Date | null
  visibility: string | null
  created_at: Date
  updated_at: Date
  status_name: string | null
  status: string | null
  organization_name: string | null
  creator_name: string | null
  creator_id: string | null
  manager_name: string | null
  manager_id: string | null
}

export abstract class ProjectListRepository {
  abstract paginateByUserAccess(
    userId: string,
    filters: ProjectAccessListFilters
  ): Promise<{ data: ProjectListRecord[]; total: number }>
  abstract getStatsByUserAccess(
    userId: string,
    filters: { organization_id?: string }
  ): Promise<{
    total_projects: number
    active_projects: number
    completed_projects: number
  }>
}
