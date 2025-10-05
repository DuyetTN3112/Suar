import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { makeTaskReadQuery } from './task_read_query_helpers.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'
import type Task from '#modules/tasks/infra/models/task'
import type { TaskDetailRecord, TaskDetailRelation, TaskRecord } from '#modules/tasks/types/task_records'


export const findActiveTaskIdentity = async (
  taskId: string,
  trx?: TransactionClientContract
): Promise<Pick<Task, 'id' | 'organization_id'> | null> => {
  return makeTaskReadQuery(trx)
    .select(['id', 'organization_id'])
    .where('id', taskId)
    .whereNull('deleted_at')
    .first()
}

export const findActiveOrFail = async (
  taskId: string,
  trx?: TransactionClientContract
): Promise<Task> => {
  const task = await makeTaskReadQuery(trx).where('id', taskId).whereNull('deleted_at').first()

  if (!task) {
    throw new NotFoundException('Task không tồn tại')
  }

  return task
}

export const findActiveOrFailAsRecord = async (
  taskId: string,
  trx?: TransactionClientContract
): Promise<TaskRecord> => {
  const task = await findActiveOrFail(taskId, trx)
  return TaskInfraMapper.toRecord(task)
}

export const findActiveByIdsInOrganization = async (
  taskIds: string[],
  organizationId: string,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  if (taskIds.length === 0) {
    return []
  }

  return makeTaskReadQuery(trx)
    .whereIn('id', taskIds)
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
}

export const findActiveByIdsInOrganizationAsRecords = async (
  taskIds: string[],
  organizationId: string,
  trx?: TransactionClientContract
): Promise<TaskRecord[]> => {
  const tasks = await findActiveByIdsInOrganization(taskIds, organizationId, trx)
  return tasks.map((task) => TaskInfraMapper.toRecord(task))
}

export const findByIdWithDetailRelations = async (
  taskId: string,
  trx?: TransactionClientContract,
  optionalRelations: TaskDetailRelation[] = []
): Promise<Task> => {
  const query = makeTaskReadQuery(trx)
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

  try {
    return await query.firstOrFail()
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : null

    if (code === 'E_ROW_NOT_FOUND') {
      throw NotFoundException.task(taskId)
    }

    throw error
  }
}

export const findByIdWithDetailRecord = async (
  taskId: string,
  trx?: TransactionClientContract,
  optionalRelations: TaskDetailRelation[] = []
): Promise<TaskDetailRecord> => {
  const task = await findByIdWithDetailRelations(taskId, trx, optionalRelations)
  return TaskInfraMapper.toDetailRecord(task)
}

export const findByIdWithWriteRelations = async (
  taskId: string,
  trx?: TransactionClientContract
): Promise<Task> => {
  return makeTaskReadQuery(trx)
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
  taskId: string,
  trx?: TransactionClientContract
): Promise<Task> => {
  return makeTaskReadQuery(trx)
    .where('id', taskId)
    .whereNull('deleted_at')
    .preload('assignee')
    .preload('creator')
    .preload('updater')
    .preload('taskStatus')
    .firstOrFail()
}

export const listPreviewByProject = async (
  projectId: string,
  limit = 8,
  trx?: TransactionClientContract
): Promise<Task[]> => {
  return makeTaskReadQuery(trx)
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .preload('assignee', (builder) => {
      void builder.select(['id', 'username', 'email'])
    })
    .orderBy('updated_at', 'desc')
    .limit(limit)
}

export const listPreviewByProjectAsRecords = async (
  projectId: string,
  limit = 8,
  trx?: TransactionClientContract
): Promise<TaskDetailRecord[]> => {
  const tasks = await listPreviewByProject(projectId, limit, trx)
  return tasks.map((task) => TaskInfraMapper.toDetailRecord(task))
}
