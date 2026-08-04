import type { TaskTransaction } from './task_transaction.js'

import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

export type TaskPermissionFilter =
  | { type: 'all' }
  | { type: 'none' }
  | { type: 'project'; projectId: string }
  | { type: 'own_only'; userId: string }
  | { type: 'own_or_assigned'; userId: string }

export interface TaskListFilters {
  status?: string[]
  priority?: string[]
  label?: string[]
  assigned_to?: string[]
  parent_task_id?: string | null
  project_id?: string
  project_sprint_id?: string | null
  task_ids?: string[]
  search?: string
  sort_by: string
  sort_order: 'asc' | 'desc'
  page: number
  limit: number
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
}

export interface TaskRecordPage {
  data: TaskDetailRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    first_page?: number
    next_page_url?: string | null
    previous_page_url?: string | null
  }
}

export interface TaskStatisticsRecord {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byLabel: Record<string, number>
  overdue: number
  completedThisWeek: number
  completedThisMonth: number
  avgCompletionDays: number | null
  timeTracking: {
    tasksWithEstimate: number
    tasksWithActual: number
    totalEstimated: number
    totalActual: number
    avgEstimated: number
    avgActual: number
    efficiency: number | null
  }
}

export interface TaskReadRepository {
  paginateByOrganization(
    organizationId: string,
    filters: TaskListFilters,
    permissionFilter: TaskPermissionFilter,
    transaction?: TaskTransaction
  ): Promise<TaskRecordPage>

  getListStatsByOrganization(
    organizationId: string,
    permissionFilter: TaskPermissionFilter,
    transaction?: TaskTransaction
  ): Promise<{ total: number; by_status: Record<string, number> }>

  findRootTasksForKanban(
    organizationId: string,
    permissionFilter: TaskPermissionFilter,
    transaction?: TaskTransaction
  ): Promise<TaskDetailRecord[]>

  findTasksForTimeline(
    organizationId: string,
    permissionFilter: TaskPermissionFilter,
    transaction?: TaskTransaction
  ): Promise<TaskDetailRecord[]>

  paginateByUser(
    options: {
      userId: string
      organizationId?: string
      filterType: 'assigned' | 'created' | 'both'
      status?: string
      priority?: string
      page: number
      limit: number
    },
    transaction?: TaskTransaction
  ): Promise<TaskRecordPage>

  findRootTaskOptions(
    organizationId: string,
    limit?: number,
    transaction?: TaskTransaction
  ): Promise<Array<{ id: string; title: string; task_status_id: string | null }>>

  getStatisticsByOrganization(
    organizationId: string,
    permissionFilter: TaskPermissionFilter,
    transaction?: TaskTransaction
  ): Promise<TaskStatisticsRecord>
}
