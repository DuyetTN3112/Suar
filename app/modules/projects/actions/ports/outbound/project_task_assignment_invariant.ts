import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectMemberTaskReassignmentInput {
  projectId: string
  removedUserId: string
  fallbackAssigneeUserId: string | null
  requestedByUserId: string
  trx?: ProjectTransaction
}

export interface ProjectMemberTaskReassignmentResult {
  reassignedTaskIds: string[]
  unassignedTaskIds: string[]
}

export interface ProjectTaskAssignmentInvariant {
  reassignOrUnassignTasksForRemovedMember(
    input: ProjectMemberTaskReassignmentInput
  ): Promise<ProjectMemberTaskReassignmentResult>
}
