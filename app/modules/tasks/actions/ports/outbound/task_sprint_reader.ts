import type { TaskTransaction } from './task_transaction.js'

export interface TaskSprintSummary {
  id: string
  name: string
}

export type TaskSprintAssignmentReason = 'created_in_backlog' | 'planned' | 'scope_change' | 'carry_over' | 'restored'
export type TaskSprintAssignmentExitReason = 'moved_to_backlog' | 'moved_to_sprint' | 'delivery_completed' | 'task_cancelled' | 'task_rejected'

export interface TaskSprintAssignmentDecision {
  allowed: boolean
  sprintStatus?: 'draft' | 'active'
  reason?: string
}

export interface TaskSprintAssignmentInput {
  organizationId: string
  projectId: string
  taskId: string
  previousSprintId: string | null
  nextSprintId: string | null
  entryReason: TaskSprintAssignmentReason
  exitReason: TaskSprintAssignmentExitReason | null
  addedAfterStart: boolean
  actorId: string | null
}

export interface TaskSprintReader {
  findSprint(
    projectId: string,
    sprintId: string
  ): Promise<TaskSprintSummary | null>

  belongsToProject(
    sprintId: string,
    organizationId: string,
    projectId: string
  ): Promise<boolean>

  validateAssignment(input: {
    context: { userId: string | null; organizationId: string | null; ip: string; userAgent: string }
    organizationId: string
    projectId: string
    sprintId: string | null
    transaction: TaskTransaction
  }): Promise<TaskSprintAssignmentDecision>

  recordInitialAssignment(input: {
    organizationId: string
    projectId: string
    taskId: string
    sprintId: string | null
    entryReason: TaskSprintAssignmentReason
    addedAfterStart: boolean
    actorId: string | null
  }, transaction: TaskTransaction): Promise<void>

  recordAssignmentTransition(input: TaskSprintAssignmentInput, transaction: TaskTransaction): Promise<void>
}
