import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { isValidId } from '#libs/id_utils'
import type Task from '#models/task'
import {
  STATUS_CATEGORY_SQL,
  applyPermissionFilter,
  baseQuery,
  getExtraField,
  toNumberValue,
  type TaskPermissionFilter,
} from './shared.js'

export const findRootTasksForKanban = async (
  organizationId: DatabaseId,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  const query = baseQuery(trx)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereNull('parent_task_id')
    .orderBy('sort_order', 'asc')
    .orderBy('updated_at', 'desc')

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

export const findTasksForTimeline = async (
  organizationId: DatabaseId,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  const query = baseQuery(trx)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .whereNull('parent_task_id')
    .whereNotNull('due_date')
    .orderBy('due_date', 'asc')

  applyPermissionFilter(query, permissionFilter)

  void query
    .preload('assignee', (builder) => void builder.select(['id', 'username', 'email']))
    .preload('creator', (builder) => void builder.select(['id', 'username']))

  return query
}

export const paginateByOrganization = async (
  organizationId: DatabaseId,
  filters: {
    status?: DatabaseId
    priority?: DatabaseId
    label?: DatabaseId
    assigned_to?: DatabaseId
    parent_task_id?: DatabaseId | null
    project_id?: DatabaseId
    search?: string
    sort_by: string
    sort_order: 'asc' | 'desc'
    page: number
    limit: number
  },
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx).where('organization_id', organizationId).whereNull('deleted_at')

  applyPermissionFilter(query, permissionFilter)

  if (filters.status) {
    void query.where('task_status_id', filters.status)
  }
  if (filters.priority) {
    void query.where('priority', filters.priority)
  }
  if (filters.label) {
    void query.where('label', filters.label)
  }
  if (filters.assigned_to) {
    void query.where('assigned_to', filters.assigned_to)
  }

  if (filters.parent_task_id === null) {
    void query.whereNull('parent_task_id')
  } else if (filters.parent_task_id) {
    void query.where('parent_task_id', filters.parent_task_id)
  }

  if (filters.project_id) {
    void query.where('project_id', filters.project_id)
  }

  if (filters.search) {
    const searchTerm = filters.search
    void query.where((searchQuery) => {
      void searchQuery
        .whereILike('title', `%${searchTerm}%`)
        .orWhereILike('description', `%${searchTerm}%`)

      if (isValidId(searchTerm)) {
        void searchQuery.orWhere('id', searchTerm)
      }
    })
  }

  void query.orderBy(filters.sort_by, filters.sort_order)
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
  organizationId: DatabaseId,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<{ total: number; by_status: Record<string, number> }> => {
  const query = baseQuery(trx)
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
    const keyValue = getExtraField(row, 'status_category')
    const key = typeof keyValue === 'string' ? keyValue : ''
    byStatus[key] = toNumberValue(getExtraField(row, 'count'))
  }

  return {
    total: toNumberValue(getExtraField(total, 'total')),
    by_status: byStatus,
  }
}

export const paginateByUser = async (
  options: {
    userId: DatabaseId
    organizationId: DatabaseId
    filterType: 'assigned' | 'created' | 'both'
    status?: DatabaseId
    priority?: DatabaseId
    page: number
    limit: number
  },
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx)
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

  return query.paginate(options.page, options.limit)
}

export const findRootTasksByOrganization = async (
  organizationId: DatabaseId,
  limit: number = 100,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  return baseQuery(trx)
    .select(['id', 'title', 'task_status_id'])
    .where('organization_id', organizationId)
    .whereNull('parent_task_id')
    .whereNull('deleted_at')
    .orderBy('title', 'asc')
    .limit(limit)
}

export const paginateOrganizationTasks = async (
  organizationId: DatabaseId,
  filters: {
    statusId?: DatabaseId
    priorityId?: DatabaseId
    projectId?: DatabaseId
    assignedTo?: DatabaseId
    search?: string
    sortField: string
    sortOrder: 'asc' | 'desc'
    page: number
    limit: number
  },
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx).where('organization_id', organizationId).whereNull('deleted_at')

  if (filters.statusId) {
    void query.where('task_status_id', filters.statusId)
  }
  if (filters.priorityId) {
    void query.where('priority', filters.priorityId)
  }
  if (filters.projectId) {
    void query.where('project_id', filters.projectId)
  }
  if (filters.assignedTo) {
    void query.where('assigned_to', filters.assignedTo)
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
    .orderBy(filters.sortField, filters.sortOrder)

  return query.paginate(filters.page, filters.limit)
}
