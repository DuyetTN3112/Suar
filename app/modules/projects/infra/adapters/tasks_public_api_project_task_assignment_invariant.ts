import type {
  ProjectMemberTaskReassignmentInput,
  ProjectMemberTaskReassignmentResult,
  ProjectTaskAssignmentInvariant,
} from '#modules/projects/application/ports/project_task_assignment_invariant'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'

export class TasksPublicApiProjectTaskAssignmentInvariant implements ProjectTaskAssignmentInvariant {
  async reassignOrUnassignTasksForRemovedMember(
    input: ProjectMemberTaskReassignmentInput
  ): Promise<ProjectMemberTaskReassignmentResult> {
    if (input.fallbackAssigneeUserId) {
      await taskPublicApi.reassignByUser(
        input.projectId,
        input.removedUserId,
        input.fallbackAssigneeUserId,
        input.trx
      )

      return {
        reassignedTaskIds: [],
        unassignedTaskIds: [],
      }
    }

    await taskPublicApi.unassignByUserInProjects([input.projectId], input.removedUserId, input.trx)

    return {
      reassignedTaskIds: [],
      unassignedTaskIds: [],
    }
  }
}
