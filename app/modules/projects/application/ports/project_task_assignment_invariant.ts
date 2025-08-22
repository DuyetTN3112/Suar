import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ProjectMemberTaskReassignmentInput {
  projectId: string
  removedUserId: string
  fallbackAssigneeUserId: string | null
  requestedByUserId: string
  trx?: TransactionClientContract
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
