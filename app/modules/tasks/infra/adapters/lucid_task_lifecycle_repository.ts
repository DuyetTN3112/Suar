import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'

function lucidTransaction(
  transaction?: TaskTransaction
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

function requiredLucidTransaction(
  transaction: TaskTransaction
): TransactionClientContract {
  return transaction as TransactionClientContract
}

type LifecycleArgs<K extends keyof TaskLifecycleRepository> = Parameters<
  TaskLifecycleRepository[K]
>

export class LucidTaskLifecycleRepository extends TaskLifecycleRepository {
  async findActiveParent(
    ...[taskId, transaction]: LifecycleArgs<'findActiveParent'>
  ) {
    const client = lucidTransaction(transaction) ?? db
    const parent = (await client
      .from('tasks')
      .select('id', 'organization_id', 'parent_task_id')
      .where('id', taskId)
      .whereNull('deleted_at')
      .first()) as
      | {
          id: string
          organization_id: string
          parent_task_id: string | null
        }
      | undefined
    return parent ?? null
  }

  findTaskDetail(
    ...[taskId, transaction, optionalRelations = []]: LifecycleArgs<'findTaskDetail'>
  ) {
    return detailQueries.findByIdWithDetailRecord(
      taskId,
      lucidTransaction(transaction),
      optionalRelations
    )
  }

  findActiveTask(...[taskId, transaction]: LifecycleArgs<'findActiveTask'>) {
    return detailQueries.findActiveOrFailAsRecord(taskId, lucidTransaction(transaction))
  }

  findActiveTasksByIds(
    ...[taskIds, organizationId, transaction]: LifecycleArgs<'findActiveTasksByIds'>
  ) {
    return detailQueries.findActiveByIdsInOrganizationAsRecords(
      taskIds,
      organizationId,
      lucidTransaction(transaction)
    )
  }

  lockActiveTask(...[taskId, transaction]: LifecycleArgs<'lockActiveTask'>) {
    return taskMutations.findActiveForUpdateAsRecord(
      taskId,
      requiredLucidTransaction(transaction)
    )
  }

  updateTask(...[taskId, data, transaction]: LifecycleArgs<'updateTask'>) {
    return taskMutations.updateTask(taskId, data, requiredLucidTransaction(transaction))
  }

  hardDeleteTask(...[taskId, transaction]: LifecycleArgs<'hardDeleteTask'>) {
    return taskMutations.hardDeleteById(taskId, requiredLucidTransaction(transaction))
  }

  countTasksByStatus(
    ...[taskStatusId, transaction]: LifecycleArgs<'countTasksByStatus'>
  ) {
    return aggregateQueries.countByTaskStatusId(
      taskStatusId,
      lucidTransaction(transaction)
    )
  }

  async hasReviewableSubmission(
    ...[taskId, transaction]: LifecycleArgs<'hasReviewableSubmission'>
  ) {
    const row: unknown = await (lucidTransaction(transaction) ?? db)
      .from('task_submissions')
      .where('task_id', taskId)
      .whereIn('status', ['submitted', 'accepted_for_review', 'locked'])
      .first()
    return Boolean(row)
  }

  listStatuses(...[organizationId, transaction]: LifecycleArgs<'listStatuses'>) {
    return TaskStatusRepository.findByOrganization(
      organizationId,
      lucidTransaction(transaction)
    )
  }

  findActiveStatus(
    ...[statusId, organizationId, transaction]: LifecycleArgs<'findActiveStatus'>
  ) {
    return TaskStatusRepository.findByIdAndOrgActive(
      statusId,
      organizationId,
      lucidTransaction(transaction)
    )
  }

  lockStatus(
    ...[statusId, organizationId, transaction]: LifecycleArgs<'lockStatus'>
  ) {
    return TaskStatusRepository.findByIdAndOrgForUpdate(
      statusId,
      organizationId,
      requiredLucidTransaction(transaction)
    )
  }

  taskStatusSlugExists(
    ...[organizationId, slug, excludeId, transaction]: LifecycleArgs<'taskStatusSlugExists'>
  ) {
    return TaskStatusRepository.slugExists(
      organizationId,
      slug,
      excludeId,
      lucidTransaction(transaction)
    )
  }

  createStatus(...[data, transaction]: LifecycleArgs<'createStatus'>) {
    return TaskStatusRepository.create(data, lucidTransaction(transaction))
  }

  updateStatus(
    ...[statusId, organizationId, data, transaction]: LifecycleArgs<'updateStatus'>
  ) {
    return TaskStatusRepository.update(
      statusId,
      organizationId,
      data,
      requiredLucidTransaction(transaction)
    )
  }

  unsetDefaultStatuses(
    ...[organizationId, transaction]: LifecycleArgs<'unsetDefaultStatuses'>
  ) {
    return TaskStatusRepository.unsetDefaults(
      organizationId,
      lucidTransaction(transaction)
    )
  }

  softDeleteStatus(
    ...[statusId, organizationId, transaction]: LifecycleArgs<'softDeleteStatus'>
  ) {
    return TaskStatusRepository.softDelete(
      statusId,
      organizationId,
      requiredLucidTransaction(transaction)
    )
  }

  listWorkflowTransitions(
    ...[organizationId, transaction]: LifecycleArgs<'listWorkflowTransitions'>
  ) {
    return TaskWorkflowTransitionRepository.findByOrganization(
      organizationId,
      lucidTransaction(transaction)
    )
  }

  findWorkflowTransitionsFromStatus(
    ...[organizationId, fromStatusId, transaction]: LifecycleArgs<'findWorkflowTransitionsFromStatus'>
  ) {
    return TaskWorkflowTransitionRepository.findFromStatus(
      organizationId,
      fromStatusId,
      lucidTransaction(transaction)
    )
  }

  createWorkflowTransition(
    ...[data, transaction]: LifecycleArgs<'createWorkflowTransition'>
  ) {
    return TaskWorkflowTransitionRepository.create(data, lucidTransaction(transaction))
  }

  async deleteWorkflowTransitions(
    ...[organizationId, transaction]: LifecycleArgs<'deleteWorkflowTransitions'>
  ) {
    await TaskWorkflowTransitionRepository.deleteByOrganization(
      organizationId,
      lucidTransaction(transaction)
    )
  }

  paginateApplicationsByTask(
    ...[taskId, options, transaction]: LifecycleArgs<'paginateApplicationsByTask'>
  ) {
    return TaskApplicationRepository.paginateByTask(
      taskId,
      options,
      lucidTransaction(transaction)
    )
  }

  paginateApplicationsByOrganization(
    ...[organizationId, options, transaction]: LifecycleArgs<'paginateApplicationsByOrganization'>
  ) {
    return TaskApplicationRepository.paginateByOrganization(
      organizationId,
      options,
      lucidTransaction(transaction)
    )
  }

  paginateApplicationsByApplicant(
    ...[applicantId, options, transaction]: LifecycleArgs<'paginateApplicationsByApplicant'>
  ) {
    return TaskApplicationRepository.paginateByApplicant(
      applicantId,
      options,
      lucidTransaction(transaction)
    )
  }

  findPendingApplicationOwnedByApplicant(
    ...[applicationId, applicantId, transaction]: LifecycleArgs<'findPendingApplicationOwnedByApplicant'>
  ) {
    return TaskApplicationRepository.findPendingOwnedByApplicantWithTask(
      applicationId,
      applicantId,
      lucidTransaction(transaction)
    )
  }

  findPendingApplication(
    ...[applicationId, transaction]: LifecycleArgs<'findPendingApplication'>
  ) {
    return TaskApplicationRepository.findPendingByIdWithTaskAndApplicant(
      applicationId,
      lucidTransaction(transaction)
    )
  }

  findExistingApplication(
    ...[taskId, applicantId, transaction]: LifecycleArgs<'findExistingApplication'>
  ) {
    return TaskApplicationRepository.findExistingNonWithdrawnByTaskAndApplicant(
      taskId,
      applicantId,
      lucidTransaction(transaction)
    )
  }

  findWithdrawnApplication(
    ...[taskId, applicantId, transaction]: LifecycleArgs<'findWithdrawnApplication'>
  ) {
    return TaskApplicationRepository.findWithdrawnByTaskAndApplicant(
      taskId,
      applicantId,
      lucidTransaction(transaction)
    )
  }

  createApplication(
    ...[data, transaction]: LifecycleArgs<'createApplication'>
  ) {
    return TaskApplicationRepository.create(
      data,
      lucidTransaction(transaction)
    )
  }

  updateApplicationStatus(
    ...[applicationId, data, transaction]: LifecycleArgs<'updateApplicationStatus'>
  ) {
    return TaskApplicationRepository.updateStatus(
      applicationId,
      data as Parameters<typeof TaskApplicationRepository.updateStatus>[1],
      lucidTransaction(transaction)
    )
  }

  reviveWithdrawnApplication(
    ...[applicationId, data, transaction]: LifecycleArgs<'reviveWithdrawnApplication'>
  ) {
    return TaskApplicationRepository.reviveWithdrawnApplication(
      applicationId,
      data as Parameters<typeof TaskApplicationRepository.reviveWithdrawnApplication>[1],
      lucidTransaction(transaction)
    )
  }

  rejectOtherPendingApplications(
    ...[
      taskId,
      excludedApplicationId,
      reviewedBy,
      rejectionReason,
      transaction,
    ]: LifecycleArgs<'rejectOtherPendingApplications'>
  ) {
    return TaskApplicationRepository.rejectOtherPendingByTask(
      taskId,
      excludedApplicationId,
      reviewedBy,
      rejectionReason,
      lucidTransaction(transaction)
    )
  }
}
