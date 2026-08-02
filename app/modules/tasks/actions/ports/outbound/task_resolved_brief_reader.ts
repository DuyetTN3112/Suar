import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'

export interface CurrentTaskAuthoringBundle {
  readonly headRevision: number
  readonly specification: TaskSpecificationVersionV1
  readonly contract: TaskContractVersionV1 | null
  readonly workFieldProvenance: TaskWorkContractResolutionResult['provenance'] | null
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readiness: TaskReadinessResultV1
  /** Finding codes present in immutable assessments before the current one, but absent now. */
  readonly readinessFindingCodesResolved: readonly string[]
}

export interface TaskResolvedBriefReader {
  readCurrentBundle(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<CurrentTaskAuthoringBundle | null>
}
