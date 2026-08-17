import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { makeTaskReadQuery } from '../../task-reading/read/task_read_query_helpers.js'

import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export const lockForUpdate = async (
  taskId: string,
  trx: TransactionClientContract
): Promise<Task> => {
  return makeTaskReadQuery(trx).where('id', taskId).whereNull('deleted_at').forUpdate().firstOrFail()
}

export const findActiveForUpdate = lockForUpdate

/**
 * Sealed: fetch the task locked for update and return as a plain TaskRecord.
 * Lucid model stays inside infra — action layer receives only the plain object.
 */
export const findActiveForUpdateAsRecord = async (
  taskId: string,
  trx: TransactionClientContract
): Promise<TaskRecord> => {
  const model = await lockForUpdate(taskId, trx)
  return TaskInfraMapper.toRecord(model)
}

/**
 * Sealed: apply partial data to an existing task (merge + save) and return TaskRecord.
 * Used by update commands that have already validated and decided on changes.
 * Lucid model is used internally for the unit-of-work pattern, then converted at the boundary.
 */
export const updateTask = async (
  taskId: string,
  data: Record<string, unknown>,
  trx: TransactionClientContract
): Promise<TaskRecord> => {
  const model = await lockForUpdate(taskId, trx)
  model.merge(data)
  await model.save()
  return TaskInfraMapper.toRecord(model)
}

export const create = async (
  data: Partial<Task>,
  trx?: TransactionClientContract
): Promise<Task> => {
  return Task.create(data, trx ? { client: trx } : undefined)
}

export const save = async (task: Task, trx?: TransactionClientContract): Promise<Task> => {
  if (trx) {
    task.useTransaction(trx)
  }
  await task.save()
  return task
}

export const hardDelete = async (task: Task, trx?: TransactionClientContract): Promise<void> => {
  if (trx) {
    task.useTransaction(trx)
  }
  await task.delete()
}

/**
 * Sealed: hard delete a task by ID.
 * Lucid model is used internally, action layer passes only the ID.
 */
export const hardDeleteById = async (
  taskId: string,
  trx: TransactionClientContract
): Promise<void> => {
  const model = await lockForUpdate(taskId, trx)
  await model.delete()
}
