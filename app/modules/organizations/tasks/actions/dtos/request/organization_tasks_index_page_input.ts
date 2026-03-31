export type OrganizationTaskSortBy =
  | 'due_date'
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'priority'

export interface OrganizationTasksIndexPageInput {
  page: number
  limit: number
  task_status_id?: string[]
  priority?: string[]
  label?: string[]
  assigned_to?: string[]
  parent_task_id?: string | null
  requested_project_id?: string
  search?: string
  sort_by: OrganizationTaskSortBy
  sort_order: 'asc' | 'desc'
}
