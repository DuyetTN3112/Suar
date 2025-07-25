import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from './shared.js'

import NotFoundException from '#exceptions/not_found_exception'
import type Task from '#infra/tasks/models/task'
import type { DatabaseId } from '#types/database'
import type { TaskDetailRelation } from '#types/task_records'


export const findActiveTaskIdentity = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Pick<Task, 'id' | 'organization_id'> | null> => {
  return baseQuery(trx)
    .select(['id', 'organization_id'])
    .where('id', taskId)
    .whereNull('deleted_at')
    .first()
}

export const findActiveOrFail = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Task> => {
  const task = await baseQuery(trx).where('id', taskId).whereNull('deleted_at').first()

  if (!task) {
    throw new NotFoundException('Task không tồn tại')
  }

  return task
}

export const findActiveByIdsInOrganization = async (
  taskIds: DatabaseId[],
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  if (taskIds.length === 0) {
    return []
  }

  return baseQuery(trx)
    .whereIn('id', taskIds)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
}

export const findByIdWithDetailRelations = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract,
  optionalRelations: TaskDetailRelation[] = []
): Promise<Task> => {
  const query = baseQuery(trx)
    .where('id', taskId)
    .whereNull('deleted_at')
    .preload('assignee')
    .preload('creator')
    .preload('updater')
    .preload('organization')
    .preload('project')
    .preload('parentTask')

  if (optionalRelations.includes('childTasks')) {
    void query.preload('childTasks', (childQuery) => {
      void childQuery.whereNull('deleted_at')
    })
  }

  if (optionalRelations.includes('versions')) {
    void query.preload('versions')
  }

  return query.firstOrFail()
}

export const findByIdWithWriteRelations = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Task> => {
  return baseQuery(trx)
    .where('id', taskId)
    .whereNull('deleted_at')
    .preload('assignee')
    .preload('creator')
    .preload('updater')
    .preload('organization')
    .preload('project')
    .preload('parentTask')
    .preload('childTasks', (query) => {
      void query.whereNull('deleted_at')
    })
    .firstOrFail()
}

export const findByIdWithStatusRelations = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Task> => {
  return baseQuery(trx)
    .where('id', taskId)
    .whereNull('deleted_at')
    .preload('assignee')
    .preload('creator')
    .preload('updater')
    .preload('taskStatus')
    .firstOrFail()
}

export const listPreviewByProject = async (
  projectId: DatabaseId,
  limit = 8,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  return baseQuery(trx)
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .preload('assignee', (builder) => {
      void builder.select(['id', 'username', 'email'])
    })
    .orderBy('updated_at', 'desc')
    .limit(limit)
}
