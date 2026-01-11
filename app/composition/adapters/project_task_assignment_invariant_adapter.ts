import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectMemberTaskReassignmentInput,
  ProjectMemberTaskReassignmentResult,
  ProjectTaskAssignmentInvariant,
} from '#modules/projects/actions/ports/outbound/project_task_assignment_invariant'
import * as taskAggregateMutations from '#modules/tasks/infra/repositories/write/task_aggregate_mutations'

export class ProjectTaskAssignmentInvariantAdapter implements ProjectTaskAssignmentInvariant {
  async reassignOrUnassignTasksForRemovedMember(
    input: ProjectMemberTaskReassignmentInput
  ): Promise<ProjectMemberTaskReassignmentResult> {
    if (input.fallbackAssigneeUserId) {
      await taskAggregateMutations.reassignByUser(
        input.projectId,
        input.removedUserId,
        input.fallbackAssigneeUserId,
        input.trx as TransactionClientContract | undefined
      )
    } else {
      await taskAggregateMutations.unassignByUserInProjects(
        [input.projectId],
        input.removedUserId,
        input.trx as TransactionClientContract | undefined
      )
    }

    return { reassignedTaskIds: [], unassignedTaskIds: [] }
  }
}

