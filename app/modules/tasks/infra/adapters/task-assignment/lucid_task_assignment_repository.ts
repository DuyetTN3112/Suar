import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  TaskAssignmentRepository,
  type TaskAssignmentRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import TaskAssignmentRepositoryImpl from '#modules/tasks/infra/repositories/task-assignment/task_assignment_repository'

function lucidTransaction(
  transaction?: TaskTransaction
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

type AssignmentArgs<K extends keyof TaskAssignmentRepository> = Parameters<
  TaskAssignmentRepository[K]
>

function toAssignmentRecord(assignment: TaskAssignment): TaskAssignmentRecord {
  const assignedAt = assignment.assigned_at.toUTC().toISO()
  if (!assignedAt) {
    throw new InvariantViolationException('Task assignment is missing a valid assigned_at value')
  }
  return {
    id: assignment.id,
    task_id: assignment.task_id,
    assignee_id: assignment.assignee_id,
    assigned_by: assignment.assigned_by,
    assigned_at: assignedAt,
    assignment_status: assignment.assignment_status,
  }
}

export class LucidTaskAssignmentRepository extends TaskAssignmentRepository {
  async findActiveByTask(
    ...[taskId, transaction]: AssignmentArgs<'findActiveByTask'>
  ) {
    const assignment = await TaskAssignmentRepositoryImpl.findActiveByTask(
      taskId,
      lucidTransaction(transaction)
    )
    return assignment ? toAssignmentRecord(assignment) : null
  }

  findWithTaskForUpdate(
    ...[assignmentId, transaction]: AssignmentArgs<'findWithTaskForUpdate'>
  ) {
    return TaskAssignmentRepositoryImpl.findWithTaskForUpdate(
      assignmentId,
      lucidTransaction(transaction)
    )
  }

  async create(...[data, transaction]: AssignmentArgs<'create'>) {
    const assignment = await TaskAssignmentRepositoryImpl.create(
      data as Parameters<typeof TaskAssignmentRepositoryImpl.create>[0],
      lucidTransaction(transaction)
    )
    return toAssignmentRecord(assignment)
  }

  cancel(...[assignmentId, notes, transaction]: AssignmentArgs<'cancel'>) {
    return TaskAssignmentRepositoryImpl.cancelAssignment(
      assignmentId,
      notes,
      lucidTransaction(transaction)
    )
  }

  completeActiveForTask(
    ...[input, transaction]: AssignmentArgs<'completeActiveForTask'>
  ) {
    return TaskAssignmentRepositoryImpl.completeActiveAssignmentsForCompletedTask(
      input,
      lucidTransaction(transaction)
    )
  }
}
