import * as aggregateQueries from './read/aggregate_queries.js'
import * as detailQueries from './read/detail_queries.js'
import * as listQueries from './read/list_queries.js'
import * as publicQueries from './read/public_queries.js'
import * as statisticsQueries from './read/statistics_queries.js'
import * as taskApplicationQueries from './read/task_application_queries.js'
import * as taskAssignmentQueries from './read/task_assignment_queries.js'
import * as taskWorkflowTransitionQueries from './read/task_workflow_transition_queries.js'
import * as aggregateMutations from './write/task_aggregate_mutations.js'
import * as taskApplicationMutations from './write/task_application_mutations.js'
import * as taskAssignmentMutations from './write/task_assignment_mutations.js'
import * as taskMutations from './write/task_mutations.js'
import * as taskRequiredSkillMutations from './write/task_required_skill_mutations.js'
import * as taskVersionMutations from './write/task_version_mutations.js'
import * as taskWorkflowTransitionMutations from './write/task_workflow_transition_mutations.js'

import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import type {
  CreateTaskRepositoryResult,
  TaskDetailRecord,
  TaskIdentityRecord,
  TaskRecord,
} from '#types/task_records'

const create = async (
  data: Parameters<typeof taskMutations.create>[0],
  trx?: Parameters<typeof taskMutations.create>[1]
): Promise<CreateTaskRepositoryResult> => {
  const model = await taskMutations.create(data, trx)

  return {
    task: TaskInfraMapper.toRecord(model),
    auditValues: TaskInfraMapper.toAuditValues(model),
  }
}

const findActiveTaskIdentity = async (
  taskId: Parameters<typeof detailQueries.findActiveTaskIdentity>[0],
  trx?: Parameters<typeof detailQueries.findActiveTaskIdentity>[1]
): Promise<TaskIdentityRecord | null> => {
  const task = await detailQueries.findActiveTaskIdentity(taskId, trx)

  if (!task) {
    return null
  }

  return {
    id: task.id,
    organization_id: task.organization_id,
  }
}

const findActiveOrFailAsRecord = async (
  taskId: Parameters<typeof detailQueries.findActiveOrFail>[0],
  trx?: Parameters<typeof detailQueries.findActiveOrFail>[1]
): Promise<TaskRecord> => {
  const task = await detailQueries.findActiveOrFail(taskId, trx)
  return TaskInfraMapper.toRecord(task)
}

const findByIdWithDetailRecord = async (
  taskId: Parameters<typeof detailQueries.findByIdWithDetailRelations>[0],
  trx?: Parameters<typeof detailQueries.findByIdWithDetailRelations>[1],
  optionalRelations?: Parameters<typeof detailQueries.findByIdWithDetailRelations>[2]
): Promise<TaskDetailRecord> => {
  const task = await detailQueries.findByIdWithDetailRelations(taskId, trx, optionalRelations)
  return TaskInfraMapper.toDetailRecord(task)
}

const listPreviewByProjectAsRecords = async (
  ...args: Parameters<typeof detailQueries.listPreviewByProject>
): Promise<TaskDetailRecord[]> => {
  const tasks = await detailQueries.listPreviewByProject(...args)
  return tasks.map((task) => TaskInfraMapper.toDetailRecord(task))
}

const findActiveByIdsInOrganizationAsRecords = async (
  taskIds: Parameters<typeof detailQueries.findActiveByIdsInOrganization>[0],
  organizationId: Parameters<typeof detailQueries.findActiveByIdsInOrganization>[1],
  trx?: Parameters<typeof detailQueries.findActiveByIdsInOrganization>[2]
): Promise<TaskRecord[]> => {
  const tasks = await detailQueries.findActiveByIdsInOrganization(taskIds, organizationId, trx)
  return tasks.map((t) => TaskInfraMapper.toRecord(t))
}

const findRootTasksForKanbanAsRecords = async (
  organizationId: Parameters<typeof listQueries.findRootTasksForKanban>[0],
  permissionFilter: Parameters<typeof listQueries.findRootTasksForKanban>[1],
  trx?: Parameters<typeof listQueries.findRootTasksForKanban>[2]
): Promise<TaskDetailRecord[]> => {
  const tasks = await listQueries.findRootTasksForKanban(organizationId, permissionFilter, trx)
  return tasks.map((t) => TaskInfraMapper.toDetailRecord(t))
}

const findTasksForTimelineAsRecords = async (
  organizationId: Parameters<typeof listQueries.findTasksForTimeline>[0],
  permissionFilter: Parameters<typeof listQueries.findTasksForTimeline>[1],
  trx?: Parameters<typeof listQueries.findTasksForTimeline>[2]
): Promise<TaskDetailRecord[]> => {
  const tasks = await listQueries.findTasksForTimeline(organizationId, permissionFilter, trx)
  return tasks.map((t) => TaskInfraMapper.toDetailRecord(t))
}

const paginateByUserAsRecords = async (
  options: Parameters<typeof listQueries.paginateByUser>[0],
  trx?: Parameters<typeof listQueries.paginateByUser>[1]
) => {
  const paginator = await listQueries.paginateByUser(options, trx)
  return {
    data: paginator.all().map((t) => TaskInfraMapper.toDetailRecord(t)),
    meta: {
      total: paginator.total,
      per_page: paginator.perPage,
      current_page: paginator.currentPage,
      last_page: paginator.lastPage,
    },
  }
}

const paginatePublicTasksAsRecords = async (
  filters: Parameters<typeof publicQueries.paginatePublicTasks>[0],
  currentUserId?: Parameters<typeof publicQueries.paginatePublicTasks>[1],
  trx?: Parameters<typeof publicQueries.paginatePublicTasks>[2]
) => {
  const paginator = await publicQueries.paginatePublicTasks(filters, currentUserId, trx)
  return {
    data: paginator.all().map((t) => TaskInfraMapper.toDetailRecord(t)),
    meta: {
      total: paginator.total,
      per_page: paginator.perPage,
      current_page: paginator.currentPage,
      last_page: paginator.lastPage,
    },
  }
}

const TaskRepository = {
  ...aggregateQueries,
  ...aggregateMutations,
  // Override detailQueries with sealed versions
  findActiveOrFail: findActiveOrFailAsRecord,
  findByIdWithDetailRelations: findByIdWithDetailRecord,
  findByIdWithDetailRecord, // Also expose sealed method directly
  listPreviewByProject: listPreviewByProjectAsRecords,
  findActiveByIdsInOrganization: findActiveByIdsInOrganizationAsRecords,
  findActiveByIdsInOrganizationAsRecords, // Also expose directly
  ...listQueries,
  ...statisticsQueries,
  ...publicQueries,
  ...taskMutations,
  ...taskApplicationQueries,
  ...taskApplicationMutations,
  ...taskAssignmentQueries,
  ...taskAssignmentMutations,
  ...taskRequiredSkillMutations,
  ...taskVersionMutations,
  ...taskWorkflowTransitionQueries,
  ...taskWorkflowTransitionMutations,
  create,
  findActiveTaskIdentity,
  // Expose sealed versions from taskMutations
  findActiveForUpdate: taskMutations.findActiveForUpdateAsRecord,
  findRootTasksForKanbanAsRecords,
  findTasksForTimelineAsRecords,
  paginateByUserAsRecords,
  paginatePublicTasksAsRecords,
  // Expose hardDeleteById for sealed delete operations
  hardDeleteById: taskMutations.hardDeleteById,
}

export type { TaskPermissionFilter } from './read/shared.js'
export type { CreateTaskRepositoryResult, TaskDetailRecord, TaskIdentityRecord }

export default TaskRepository
