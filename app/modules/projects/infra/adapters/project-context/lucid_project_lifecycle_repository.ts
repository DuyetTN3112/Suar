import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import * as projectModelQueries from '#modules/projects/infra/repositories/project-context/read/project_model_queries'
import * as projectMutations from '#modules/projects/infra/repositories/project-context/write/project_mutations'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

export class LucidProjectLifecycleRepository implements ProjectLifecycleRepository {
  findDetail(projectId: string, transaction?: ProjectTransaction) {
    return projectModelQueries.findDetailRecord(
      projectId,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  findForUpdate(projectId: string, transaction: ProjectTransaction) {
    return projectMutations.findActiveForUpdateRecord(
      projectId,
      lucidTransaction(transaction)
    )
  }

  create(data: Record<string, unknown>, transaction: ProjectTransaction) {
    return projectMutations.createRecord(data, lucidTransaction(transaction))
  }

  update(
    projectId: string,
    data: Record<string, unknown>,
    transaction: ProjectTransaction
  ) {
    return projectMutations.updateByIdRecord(
      projectId,
      data,
      lucidTransaction(transaction)
    )
  }

  updateOwner(projectId: string, ownerId: string, transaction: ProjectTransaction) {
    return projectMutations.updateOwnerRecord(
      projectId,
      ownerId,
      lucidTransaction(transaction)
    )
  }

  softDelete(projectId: string, transaction: ProjectTransaction) {
    return projectMutations.softDeleteByIdRecord(projectId, lucidTransaction(transaction))
  }

  hardDelete(projectId: string, transaction: ProjectTransaction) {
    return projectMutations.hardDeleteByIdRecord(projectId, lucidTransaction(transaction))
  }
}
