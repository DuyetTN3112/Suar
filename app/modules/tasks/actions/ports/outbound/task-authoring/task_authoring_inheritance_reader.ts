import type { TaskReadinessFindingV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskWorkContractLayer } from '#modules/tasks/domain/task-authoring/task_contract_resolution'

export interface TaskAuthoringInheritanceReadInput {
  readonly organizationId: string
  readonly projectId: string
  readonly projectContextVersionId: string | null
  readonly workPackageVersionId: string | null
}

export interface TaskAuthoringInheritanceSnapshot {
  readonly projectContext: TaskWorkContractLayer | null
  readonly workPackage: TaskWorkContractLayer | null
  readonly findings: readonly TaskReadinessFindingV1[]
}

/** Reads only exact immutable pins and must fail closed on tenant/project mismatch. */
export interface TaskAuthoringInheritanceReader {
  readExactPins(
    input: TaskAuthoringInheritanceReadInput,
    trx?: TaskTransaction
  ): Promise<TaskAuthoringInheritanceSnapshot>
}
