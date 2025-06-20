import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { DatabaseId } from '#types/database'
import type Task from '#models/task'
import {
  LEGACY_TASK_STATUS,
  STATUS_CATEGORY_SQL,
  TERMINAL_TASK_STATUS_VALUES,
  applyPermissionFilter,
  baseQuery,
  getExtraField,
  getRecordField,
  toNumberValue,
  type TaskPermissionFilter,
} from './shared.js'

const statTotal = async (base: ModelQueryBuilderContract<typeof Task>): Promise<number> => {
  const result = await base.clone().count('* as total').first()
  return toNumberValue(getExtraField(result, 'total'))
}

const statGroupBy = async (
  base: ModelQueryBuilderContract<typeof Task>,
  column: string
): Promise<Record<string, number>> => {
  const query = base.clone().count('* as count')
  if (column === 'status') {
    void query.join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    void query.select(base.client.raw(`${STATUS_CATEGORY_SQL} as status_category`))
  } else {
    void query.select(column)
    void query.whereNotNull(column)
  }

  const results = await (column === 'status'
    ? query.groupByRaw(STATUS_CATEGORY_SQL)
    : query.groupBy(column))

  const stats: Record<string, number> = {}
  for (const row of results) {
    const keyField = column === 'status' ? 'status_category' : column
    const keyValue = getExtraField(row, keyField) ?? getRecordField(row, keyField)
    const key = typeof keyValue === 'string' ? keyValue : ''
    stats[key] = toNumberValue(getExtraField(row, 'count'))
  }
  return stats
}

const statOverdue = async (base: ModelQueryBuilderContract<typeof Task>): Promise<number> => {
  const result = await base
    .clone()
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .whereNotNull('due_date')
    .where('due_date', '<', DateTime.now().toFormat('yyyy-MM-dd'))
    .whereRaw(`${STATUS_CATEGORY_SQL} NOT IN (?, ?)`, [...TERMINAL_TASK_STATUS_VALUES])
    .count('* as total')
    .first()

  return toNumberValue(getExtraField(result, 'total'))
}

const statCompletedSince = async (
  base: ModelQueryBuilderContract<typeof Task>,
  since: DateTime
): Promise<number> => {
  const sinceSql = since.toSQL()
  if (!sinceSql) {
    return 0
  }

  const result = await base
    .clone()
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .whereRaw(`${STATUS_CATEGORY_SQL} = ?`, [LEGACY_TASK_STATUS.DONE])
    .where('updated_at', '>=', sinceSql)
    .count('* as total')
    .first()

  return toNumberValue(getExtraField(result, 'total'))
}

const statAvgCompletionDays = async (
  base: ModelQueryBuilderContract<typeof Task>
): Promise<number | null> => {
  const completedTasks = await base
    .clone()
    .join('task_statuses as ts', 'ts.id', 'tasks.task_status_id')
    .whereRaw(`${STATUS_CATEGORY_SQL} = ?`, [LEGACY_TASK_STATUS.DONE])
    .select('created_at', 'updated_at')

  if (completedTasks.length === 0) {
    return null
  }

  const totalDays = completedTasks.reduce((sum: number, task: Task) => {
    const created = DateTime.fromJSDate(task.created_at.toJSDate())
    const completed = DateTime.fromJSDate(task.updated_at.toJSDate())
    return sum + completed.diff(created, 'days').days
  }, 0)

  return Math.round(totalDays / completedTasks.length)
}

const statTimeTracking = async (
  base: ModelQueryBuilderContract<typeof Task>
): Promise<{
  tasksWithEstimate: number
  tasksWithActual: number
  totalEstimated: number
  totalActual: number
  avgEstimated: number
  avgActual: number
  efficiency: number | null
}> => {
  const tasks = await base.clone().select('estimated_time', 'actual_time')

  const tasksWithEstimate = tasks.filter((task) => task.estimated_time).length
  const tasksWithActual = tasks.filter((task) => task.actual_time).length
  const totalEstimated = tasks.reduce((sum, task) => sum + (task.estimated_time || 0), 0)
  const totalActual = tasks.reduce((sum, task) => sum + (task.actual_time || 0), 0)
  const avgEstimated = tasksWithEstimate > 0 ? totalEstimated / tasksWithEstimate : 0
  const avgActual = tasksWithActual > 0 ? totalActual / tasksWithActual : 0
  const efficiency = totalEstimated > 0 ? totalActual / totalEstimated : null

  return {
    tasksWithEstimate,
    tasksWithActual,
    totalEstimated: Math.round(totalEstimated * 10) / 10,
    totalActual: Math.round(totalActual * 10) / 10,
    avgEstimated: Math.round(avgEstimated * 10) / 10,
    avgActual: Math.round(avgActual * 10) / 10,
    efficiency: efficiency ? Math.round(efficiency * 100) / 100 : null,
  }
}

export const getStatisticsByOrganization = async (
  organizationId: DatabaseId,
  permissionFilter: TaskPermissionFilter,
  trx?: TransactionClientContract
): Promise<{
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
}> => {
  const base = baseQuery(trx).where('organization_id', organizationId).whereNull('deleted_at')
  applyPermissionFilter(base, permissionFilter)

  const [
    total,
    byStatus,
    byPriority,
    byLabel,
    overdue,
    completedThisWeek,
    completedThisMonth,
    avgCompletionDays,
    timeTracking,
  ] = await Promise.all([
    statTotal(base),
    statGroupBy(base, 'status'),
    statGroupBy(base, 'priority'),
    statGroupBy(base, 'label'),
    statOverdue(base),
    statCompletedSince(base, DateTime.now().startOf('week')),
    statCompletedSince(base, DateTime.now().startOf('month')),
    statAvgCompletionDays(base),
    statTimeTracking(base),
  ])

  return {
    total,
    byStatus,
    byPriority,
    byLabel,
    overdue,
    completedThisWeek,
    completedThisMonth,
    avgCompletionDays,
    timeTracking,
  }
}
