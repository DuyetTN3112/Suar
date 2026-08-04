import type {
  TaskContractVersionV1,
  TaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'

export interface HistoricalTaskContractBundle {
  readonly specification: TaskSpecificationVersionV1
  readonly contract: TaskContractVersionV1
  readonly workFieldProvenance: TaskWorkContractResolutionResult['provenance']
}

export interface TaskContractHistoryReader {
  readHistoricalBundle(input: {
    taskId: string
    specificationVersionId: string
    contractVersionId: string
  }): Promise<HistoricalTaskContractBundle | null>
}
