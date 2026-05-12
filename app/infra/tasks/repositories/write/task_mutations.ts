import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from '../read/shared.js'

import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import Task from '#infra/tasks/models/task'
import type { DatabaseId } from '#types/database'
import type { TaskRecord } from '#types/task_records'

export const lockForUpdate = async (
  taskId: DatabaseId,
  trx: TransactionClientContract
): Promise<Task> => {
  return baseQuery(trx).where('id', taskId).whereNull('deleted_at').forUpdate().firstOrFail()
}

export const findActiveForUpdate = lockForUpdate

/**
 * Sealed: fetch the task locked for update and return as a plain TaskRecord.
 * Lucid model stays inside infra — action layer receives only the plain object.
 */
export const findActiveForUpdateAsRecord = async (
  taskId: DatabaseId,
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
  taskId: DatabaseId,
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
  taskId: DatabaseId,
  trx: TransactionClientContract
): Promise<void> => {
  const model = await lockForUpdate(taskId, trx)
  await model.delete()
}
