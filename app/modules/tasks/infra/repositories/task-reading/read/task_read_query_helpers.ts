import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import type { TaskPermissionFilter } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import Task from '#modules/tasks/infra/models/task-authoring/task'

export type { TaskPermissionFilter } from '#modules/tasks/actions/ports/outbound/task_read_repository'

export const LEGACY_TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const

export const TERMINAL_TASK_STATUS_VALUES = [
  LEGACY_TASK_STATUS.DONE,
  LEGACY_TASK_STATUS.CANCELLED,
] as const

export const STATUS_CATEGORY_SQL = 'ts.category'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const readTaskModelField = (value: unknown, field: string): unknown => {
  if (!isRecord(value)) {
    return undefined
  }
  return value[field]
}

export const readTaskModelExtraField = (value: unknown, field: string): unknown => {
  const extras = readTaskModelField(value, '$extras')
  if (!isRecord(extras)) {
    return undefined
  }
  return extras[field]
}

export const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const applyPermissionFilter = (
  query: ModelQueryBuilderContract<typeof Task>,
  filter: TaskPermissionFilter
): void => {
  switch (filter.type) {
    case 'all':
      break
    case 'none':
      void query.whereRaw('1 = 0')
      break
    case 'project':
      void query.where('tasks.project_id', filter.projectId)
      break
    case 'own_only':
      void query.where('tasks.creator_id', filter.userId)
      break
    case 'own_or_assigned':
      void query.where((builder) => {
        void builder
          .where('tasks.creator_id', filter.userId)
          .orWhere('tasks.assigned_to', filter.userId)
      })
      break
  }
}

export const makeTaskReadQuery = (trx?: TransactionClientContract) => {
  return trx && typeof (trx as { modelQuery?: unknown }).modelQuery === 'function'
    ? Task.query({ client: trx })
    : Task.query()
}
