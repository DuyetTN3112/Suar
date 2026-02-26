import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { applyStandardFilters } from './support/filter_helpers.js'
import {
  STATUS_CATEGORY_SQL,
  applyPermissionFilter,
  makeTaskReadQuery,
  readTaskModelExtraField,
  toNumberValue,
  type TaskPermissionFilter,
} from './task_read_query_helpers.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'
import type Task from '#modules/tasks/infra/models/task'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

function applyStableTaskOrder(
  query: ReturnType<typeof makeTaskReadQuery>,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): void {
  void query.orderBy(sortBy, sortOrder)
  if (sortBy !== 'id') {
    void query.orderBy('id', sortOrder)
  }
}

function applyRankedTaskOrder(
  query: ReturnType<typeof makeTaskReadQuery>,
  taskIds: string[]
): void {
  const rankByTaskId = taskIds
    .map((taskId, index) => `WHEN id = '${taskId}' THEN ${String(index)}`)
    .join(' ')
  void query.orderByRaw(`CASE ${rankByTaskId} ELSE ${String(taskIds.length)} END ASC`)
  void query.orderBy('id', 'desc')
}

export const findRootTasksForKanban = async (
  organizationId: string,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  const query = makeTaskReadQuery(trx)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereNull('parent_task_id')
    .orderBy('sort_order', 'asc')
    .orderBy('updated_at', 'desc')
    .orderBy('id', 'desc')

  applyPermissionFilter(query, permissionFilter)

  void query
    .preload('assignee', (builder) => void builder.select(['id', 'username', 'email']))
    .preload('creator', (builder) => void builder.select(['id', 'username']))
    .preload('taskStatus')
    .preload('childTasks', (builder) => {
      void builder
        .whereNull('deleted_at')
        .select(['id', 'title', 'status', 'task_status_id', 'parent_task_id'])
    })

  return query
}

export const findRootTasksForKanbanAsRecords = async (
  organizationId: string,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<TaskDetailRecord[]> => {
  const tasks = await findRootTasksForKanban(organizationId, permissionFilter, trx)
  return tasks.map((task) => TaskInfraMapper.toDetailRecord(task))
}

export const findTasksForTimeline = async (
  organizationId: string,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  const query = makeTaskReadQuery(trx)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereNull('parent_task_id')
    .whereNotNull('due_date')
    .orderBy('due_date', 'asc')
    .orderBy('id', 'asc')

  applyPermissionFilter(query, permissionFilter)

  void query
    .preload('assignee', (builder) => void builder.select(['id', 'username', 'email']))
    .preload('creator', (builder) => void builder.select(['id', 'username']))

  return query
}

export const findTasksForTimelineAsRecords = async (
  organizationId: string,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<TaskDetailRecord[]> => {
  const tasks = await findTasksForTimeline(organizationId, permissionFilter, trx)
  return tasks.map((task) => TaskInfraMapper.toDetailRecord(task))
}

export const paginateByOrganization = async (
  organizationId: string,
  filters: {
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
  },
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
) => {
  const query = makeTaskReadQuery(trx).where('organization_id', organizationId).whereNull('deleted_at')

  applyPermissionFilter(query, permissionFilter)

  if (filters.status && filters.status.length > 0) {
    void query.whereIn('task_status_id', filters.status)
  }
  if (filters.priority && filters.priority.length > 0) {
    void query.whereIn('priority', filters.priority)
  }
  if (filters.label && filters.label.length > 0) {
    void query.whereIn('label', filters.label)
  }
  if (filters.assigned_to && filters.assigned_to.length > 0) {
    void query.whereIn('assigned_to', filters.assigned_to)
  }

  if (filters.parent_task_id === null) {
    void query.whereNull('parent_task_id')
  } else if (filters.parent_task_id) {
    void query.where('parent_task_id', filters.parent_task_id)
  }

  if (filters.project_id) {
    void query.where('project_id', filters.project_id)
  }

  if (filters.project_sprint_id === null) {
    void query.whereNull('project_sprint_id')
  } else if (filters.project_sprint_id) {
    void query.where('project_sprint_id', filters.project_sprint_id)
  }

  if (filters.task_ids && filters.task_ids.length > 0) {
    void query.whereIn('id', filters.task_ids)
  }

  applyStandardFilters(query, omitUndefined({
    search: filters.task_ids && filters.task_ids.length > 0 ? undefined : filters.search,
    searchFields: ['title', 'description'],
    created_at_start: filters.created_at_start,
    created_at_end: filters.created_at_end,
    due_date_start: filters.due_date_start,
    due_date_end: filters.due_date_end,
  }))

  if (filters.task_ids && filters.task_ids.length > 0) {
    applyRankedTaskOrder(query, filters.task_ids)
  } else {
    applyStableTaskOrder(query, filters.sort_by, filters.sort_order)
  }
  void query
    .preload('assignee', (builder) => {
      void builder.select(['id', 'username', 'email'])
    })
    .preload('creator', (builder) => {
      void builder.select(['id', 'username'])
    })
    .preload('project', (builder) => {
      void builder.select(['id', 'name'])
    })
    .preload('parentTask', (builder) => {
      void builder.select(['id', 'title', 'task_status_id'])
    })
    .preload('childTasks', (builder) => {
      void builder.whereNull('deleted_at')
      void builder.select(['id', 'title', 'task_status_id'])
    })

  return query.paginate(filters.page, filters.limit)
}

export const getListStatsByOrganization = async (
  organizationId: string,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<{ total: number; by_status: Record<string, number> }> => {
  const query = makeTaskReadQuery(trx)
    .where('tasks.organization_id', organizationId)
    .whereNull('tasks.deleted_at')

  applyPermissionFilter(query, permissionFilter)

  const total = await query.clone().count('* as total').first()
  const byStatusResults = await query
    .clone()
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .select(query.client.raw(`${STATUS_CATEGORY_SQL} as status_category`))
    .count('* as count')
    .groupByRaw(STATUS_CATEGORY_SQL)

  const byStatus: Record<string, number> = {}
  for (const row of byStatusResults) {
    const keyValue = readTaskModelExtraField(row, 'status_category')
    const key = typeof keyValue === 'string' ? keyValue : ''
    byStatus[key] = toNumberValue(readTaskModelExtraField(row, 'count'))
  }

  return {
    total: toNumberValue(readTaskModelExtraField(total, 'total')),
    by_status: byStatus,
  }
}

export const paginateByUser = async (
  options: {
    userId: string
    organizationId: string
    filterType: 'assigned' | 'created' | 'both'
    status?: string
    priority?: string
    page: number
    limit: number
  },
  trx?: TransactionClientContract
) => {
  const query = makeTaskReadQuery(trx)
    .where('organization_id', options.organizationId)
    .whereNull('deleted_at')

  if (options.filterType === 'assigned') {
    void query.where('assigned_to', options.userId)
  } else if (options.filterType === 'created') {
    void query.where('creator_id', options.userId)
  } else {
    void query.where((builder) => {
      void builder.where('assigned_to', options.userId).orWhere('creator_id', options.userId)
    })
  }

  if (options.status) {
    void query.where('task_status_id', options.status)
  }
  if (options.priority) {
    void query.where('priority', options.priority)
  }

  void query
    .preload('assignee', (builder) => void builder.select(['id', 'username']))
    .preload('creator', (builder) => void builder.select(['id', 'username']))
    .preload('project', (builder) => void builder.select(['id', 'name']))
    .orderBy('due_date', 'asc')
    .orderBy('id', 'asc')

  return query.paginate(options.page, options.limit)
}

export const paginateByUserAsRecords = async (
  options: Parameters<typeof paginateByUser>[0],
  trx?: TransactionClientContract
) => {
  const paginator = await paginateByUser(options, trx)
  return {
    data: paginator.all().map((task) => TaskInfraMapper.toDetailRecord(task)),
    meta: {
      total: paginator.total,
      per_page: paginator.perPage,
      current_page: paginator.currentPage,
      last_page: paginator.lastPage,
    },
  }
}

export const findRootTasksByOrganization = async (
  organizationId: string,
  limit = 100,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  return makeTaskReadQuery(trx)
    .select(['id', 'title', 'task_status_id'])
    .where('organization_id', organizationId)
    .whereNull('parent_task_id')
    .whereNull('deleted_at')
    .orderBy('title', 'asc')
    .limit(limit)
}

export const paginateOrganizationTasks = async (
  organizationId: string,
  filters: {
    statusId?: string[]
    priorityId?: string[]
    projectId?: string
    assignedTo?: string[]
    search?: string
    sortField: string
    sortOrder: 'asc' | 'desc'
    page: number
    limit: number
  },
  trx?: TransactionClientContract
) => {
  const query = makeTaskReadQuery(trx).where('organization_id', organizationId).whereNull('deleted_at')

  if (filters.statusId && filters.statusId.length > 0) {
    void query.whereIn('task_status_id', filters.statusId)
  }
  if (filters.priorityId && filters.priorityId.length > 0) {
    void query.whereIn('priority', filters.priorityId)
  }
  if (filters.projectId) {
    void query.where('project_id', filters.projectId)
  }
  if (filters.assignedTo && filters.assignedTo.length > 0) {
    void query.whereIn('assigned_to', filters.assignedTo)
  }

  if (filters.search) {
    const search = filters.search
    void query.where((searchQuery) => {
      void searchQuery.whereILike('title', `%${search}%`).orWhereILike('description', `%${search}%`)
    })
  }

  void query
    .preload('assignee', (builder) => {
      void builder.select(['id', 'username', 'email'])
    })
    .preload('creator', (builder) => {
      void builder.select(['id', 'username'])
    })
    .preload('project', (builder) => {
      void builder.select(['id', 'name', 'status'])
    })
  applyStableTaskOrder(query, filters.sortField, filters.sortOrder)

  return query.paginate(filters.page, filters.limit)
}
