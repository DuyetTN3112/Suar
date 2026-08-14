import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { TaskFactSourceReader } from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { listAssignmentDeliverySourceRows } from '#modules/tasks/infra/repositories/task-assignment/read/assignment_delivery_fact_queries'
import { listCompletedAssignmentProfileSourceRows } from '#modules/tasks/infra/repositories/task-assignment/read/completed_assignment_profile_fact_queries'
import {
  findReviewAssignmentContextSourceRows,
  listAssignmentIdSourceRowsByProjectIds,
  listAssignmentIdSourceRowsByProjectIdsIncludingDeletedTasks,
  listAssignmentIdSourceRowsByTaskIds,
  listAssignmentIdSourceRowsByTaskStatusIds,
} from '#modules/tasks/infra/repositories/task-assignment/read/review_assignment_context_queries'
import { listTaskTalentMatchContextSourceRows } from '#modules/tasks/infra/repositories/task-assignment/read/task_talent_match_context_queries'

function lucidTransaction(
  transaction?: TaskTransaction
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

type FactSourceArgs<K extends keyof TaskFactSourceReader> = Parameters<
  TaskFactSourceReader[K]
>

export class LucidTaskFactSourceReader extends TaskFactSourceReader {
  listTalentMatchContext(
    ...[lookup, organizationId, transaction]: FactSourceArgs<'listTalentMatchContext'>
  ) {
    return listTaskTalentMatchContextSourceRows(
      lookup,
      organizationId,
      lucidTransaction(transaction)
    )
  }

  listAssignmentDelivery(
    ...[userId, transaction]: FactSourceArgs<'listAssignmentDelivery'>
  ) {
    return listAssignmentDeliverySourceRows(userId, lucidTransaction(transaction))
  }

  listCompletedAssignmentProfiles(
    ...[userId, transaction]: FactSourceArgs<'listCompletedAssignmentProfiles'>
  ) {
    return listCompletedAssignmentProfileSourceRows(
      userId,
      lucidTransaction(transaction)
    )
  }

  findReviewAssignmentContexts(
    ...[assignmentIds, transaction]: FactSourceArgs<'findReviewAssignmentContexts'>
  ) {
    return findReviewAssignmentContextSourceRows(
      assignmentIds,
      lucidTransaction(transaction)
    )
  }

  async listAssignmentIdsByTaskIds(
    ...[taskIds, transaction]: FactSourceArgs<'listAssignmentIdsByTaskIds'>
  ) {
    const rows = await listAssignmentIdSourceRowsByTaskIds(
      taskIds,
      lucidTransaction(transaction)
    )
    return rows.map((row) => row.assignment_id)
  }

  async listAssignmentIdsByProjectIds(
    ...[projectIds, transaction]: FactSourceArgs<'listAssignmentIdsByProjectIds'>
  ) {
    const rows = await listAssignmentIdSourceRowsByProjectIds(
      projectIds,
      lucidTransaction(transaction)
    )
    return rows.map((row) => row.assignment_id)
  }

  async listAssignmentIdsByProjectIdsIncludingDeletedTasks(
    ...[projectIds, transaction]: FactSourceArgs<'listAssignmentIdsByProjectIdsIncludingDeletedTasks'>
  ) {
    const rows = await listAssignmentIdSourceRowsByProjectIdsIncludingDeletedTasks(
      projectIds,
      lucidTransaction(transaction)
    )
    return rows.map((row) => row.assignment_id)
  }

  async listAssignmentIdsByTaskStatusIds(
    ...[taskStatusIds, transaction]: FactSourceArgs<'listAssignmentIdsByTaskStatusIds'>
  ) {
    const rows = await listAssignmentIdSourceRowsByTaskStatusIds(
      taskStatusIds,
      lucidTransaction(transaction)
    )
    return rows.map((row) => row.assignment_id)
  }
}
