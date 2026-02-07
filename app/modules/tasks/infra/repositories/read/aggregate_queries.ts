import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  STATUS_CATEGORY_SQL,
  TERMINAL_TASK_STATUS_VALUES,
  LEGACY_TASK_STATUS,
  baseQuery,
  getExtraField,
  toNumberValue,
} from './shared.js'

import type { DatabaseId } from '#types/database'

export const countIncompleteByProject = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx)
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .where('tasks.project_id', projectId)
    .whereNull('tasks.deleted_at')
    .whereRaw(`${STATUS_CATEGORY_SQL} NOT IN (?, ?)`, [...TERMINAL_TASK_STATUS_VALUES])
    .count('* as total')

  return toNumberValue(getExtraField(result[0], 'total'))
}

// NOTE: reassignByUser and unassignByUserInProjects have been moved to
// write/task_aggregate_mutations.ts as they are bulk UPDATE operations.

export const getTasksSummaryByProject = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<{
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
}> => {
  const query = baseQuery(trx)
  const tasks = await query
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .where('tasks.project_id', projectId)
    .whereNull('tasks.deleted_at')
    .select('tasks.due_date')
    .select(query.client.raw(`${STATUS_CATEGORY_SQL} as status_category`))

  const now = new Date()
  let pending = 0
  let inProgress = 0
  let completed = 0
  let overdue = 0

  for (const task of tasks) {
    const statusCategoryValue = getExtraField(task, 'status_category')
    const statusCategory =
      typeof statusCategoryValue === 'string' ? statusCategoryValue : LEGACY_TASK_STATUS.IN_PROGRESS

    if (statusCategory === LEGACY_TASK_STATUS.TODO) {
      pending++
    } else if (statusCategory === LEGACY_TASK_STATUS.IN_PROGRESS) {
      inProgress++
    } else if (statusCategory === LEGACY_TASK_STATUS.DONE) {
      completed++
    }

    if (
      !TERMINAL_TASK_STATUS_VALUES.includes(
        statusCategory as (typeof TERMINAL_TASK_STATUS_VALUES)[number]
      ) &&
      task.due_date
    ) {
      const dueDate = task.due_date instanceof Date ? task.due_date : task.due_date.toJSDate()
      if (dueDate < now) {
        overdue++
      }
    }
  }

  return {
    total: tasks.length,
    pending,
    in_progress: inProgress,
    completed,
    overdue,
  }
}

export const countByAssignees = async (
  projectId: DatabaseId,
  userIds?: DatabaseId[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  let query = baseQuery(trx)
    .where('tasks.project_id', projectId)
    .whereNull('tasks.deleted_at')
    .whereNotNull('tasks.assigned_to')
    .select('tasks.assigned_to')
    .count('* as total')
    .groupBy('tasks.assigned_to')

  if (userIds && userIds.length > 0) {
    query = query.whereIn('tasks.assigned_to', userIds)
  }

  const results = await query
  const map = new Map<string, number>()
  for (const row of results) {
    if (row.assigned_to) {
      map.set(row.assigned_to, toNumberValue(getExtraField(row, 'total')))
    }
  }
  return map
}

export const countByProjectIds = async (
  projectIds: DatabaseId[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  if (projectIds.length === 0) {
    return new Map()
  }

  const results = await baseQuery(trx)
    .whereIn('tasks.project_id', projectIds)
    .whereNull('tasks.deleted_at')
    .select('tasks.project_id')
    .count('* as total')
    .groupBy('tasks.project_id')

  const map = new Map<string, number>()
  for (const row of results) {
    if (row.project_id) {
      map.set(row.project_id, toNumberValue(getExtraField(row, 'total')))
    }
  }
  return map
}

export const countByTaskStatusId = async (
  taskStatusId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const row = await baseQuery(trx)
    .where('tasks.task_status_id', taskStatusId)
    .whereNull('tasks.deleted_at')
    .count('* as total')
    .first()

  return toNumberValue(getExtraField(row, 'total'))
}
