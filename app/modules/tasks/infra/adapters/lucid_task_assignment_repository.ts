import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import TaskAssignmentRepositoryImpl from '#modules/tasks/infra/repositories/task_assignment_repository'

function lucidTransaction(
  transaction?: TaskTransaction
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

type AssignmentArgs<K extends keyof TaskAssignmentRepository> = Parameters<
  TaskAssignmentRepository[K]
>

export class LucidTaskAssignmentRepository extends TaskAssignmentRepository {
  async findActiveByTask(
    ...[taskId, transaction]: AssignmentArgs<'findActiveByTask'>
  ) {
    const assignment = await TaskAssignmentRepositoryImpl.findActiveByTask(
      taskId,
      lucidTransaction(transaction)
    )
    return assignment
      ? {
          id: assignment.id,
          task_id: assignment.task_id,
          assignee_id: assignment.assignee_id,
          assignment_status: assignment.assignment_status,
        }
      : null
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
    return {
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
      assignment_status: assignment.assignment_status,
    }
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
