import type {
  TaskPublicApiRepositoryPort,
  TaskPublicApiTaskSummary,
} from './task_public_api_repository_port.js'

import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import * as aggregateQueries from '#infra/tasks/repositories/read/aggregate_queries'
import * as detailQueries from '#infra/tasks/repositories/read/detail_queries'
import * as taskAssignmentQueries from '#infra/tasks/repositories/read/task_assignment_queries'
import * as taskAggregateMutations from '#infra/tasks/repositories/write/task_aggregate_mutations'


export const taskPublicApiRepository: TaskPublicApiRepositoryPort = {
  countByAssignees: aggregateQueries.countByAssignees,
  countByProjectIds: aggregateQueries.countByProjectIds,
  countIncompleteByProject: aggregateQueries.countIncompleteByProject,

  async getTasksSummaryByProject(projectId, trx): Promise<TaskPublicApiTaskSummary> {
    return aggregateQueries.getTasksSummaryByProject(projectId, trx)
  },

  async listPreviewByProject(projectId, limit, trx) {
    const tasks = await detailQueries.listPreviewByProject(projectId, limit, trx)
    return tasks.map((task) => TaskInfraMapper.toDetailRecord(task))
  },

  reassignByUser: taskAggregateMutations.reassignByUser,
  unassignByUserInProjects: taskAggregateMutations.unassignByUserInProjects,

  async findCompletedAssignment(assignmentId, trx) {
    const assignment = await taskAssignmentQueries.findCompletedById(assignmentId, trx)
    if (!assignment) {
      return null
    }

    return {
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
    }
  },
}
