import { DateTime } from 'luxon'

import type {
  TaskAssignmentRecord,
  TaskAssignmentRepository,
} from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { assertTaskSkillEligibility } from '#modules/tasks/domain/task-assignment/task_skill_eligibility'
import { canAssignTaskInStatus } from '#modules/tasks/domain/task-status/task_status_rules'
import { AssignmentType } from '#modules/tasks/public_contracts/task_constants'

export interface SyncAssignmentInput {
  taskId: string
  assigneeId: string | null
  assignedBy: string
  assignmentType?: AssignmentType
  estimatedHours?: number
  taskRowAlreadySynchronized?: boolean
  /** Direct assignment may intentionally exceed the task's minimum skill level. */
  enforceSkillEligibility?: boolean
}

/**
 * Reusable command-internal assignment sub-operation used by assignment and
 * application-approval commands inside the caller-owned transaction.
 */
export async function synchronizeTaskAssignment(
  input: SyncAssignmentInput,
  transaction: TaskTransaction,
  assignments: TaskAssignmentRepository,
  tasks: TaskLifecycleRepository,
  skillReader: TaskSkillReader
): Promise<TaskAssignmentRecord | null> {
  const task = await tasks.lockActiveTask(input.taskId, transaction)
  if (input.assigneeId !== null && input.enforceSkillEligibility !== false) {
    const eligibility = await skillReader.getTaskSkillEligibility(
      input.taskId,
      input.assigneeId,
      transaction
    )
    assertTaskSkillEligibility(eligibility, 'giao task')
  }
  if (input.assigneeId !== null && task.task_status_id) {
    const status = await tasks.findActiveStatus(
      task.task_status_id,
      task.organization_id,
      transaction,
      task.project_id ?? undefined
    )
    enforcePolicy(canAssignTaskInStatus(status))
  }
  const active = await assignments.findActiveByTask(input.taskId, transaction)
  if (input.assigneeId !== null && active?.assignee_id === input.assigneeId) {
    if (!input.taskRowAlreadySynchronized) {
      await tasks.updateTask(
        input.taskId,
        {
          assigned_to: input.assigneeId,
          updated_by: input.assignedBy,
        },
        transaction
      )
    }
    return active
  }

  if (active) {
    await assignments.cancel(active.id, `Reassigned by user_id: ${input.assignedBy}`, transaction)
  }

  const synchronizedAssignment =
    input.assigneeId === null
      ? null
      : await assignments.create(
          {
            task_id: input.taskId,
            assignee_id: input.assigneeId,
            assigned_by: input.assignedBy,
            assignment_type: input.assignmentType ?? AssignmentType.MEMBER,
            assignment_status: 'active',
            assigned_at: DateTime.now(),
            ...(input.estimatedHours === undefined ? {} : { estimated_hours: input.estimatedHours }),
          },
          transaction
        )
  if (!input.taskRowAlreadySynchronized) {
    await tasks.updateTask(
      input.taskId,
      {
        assigned_to: input.assigneeId,
        updated_by: input.assignedBy,
      },
      transaction
    )
  }
  return synchronizedAssignment
}
