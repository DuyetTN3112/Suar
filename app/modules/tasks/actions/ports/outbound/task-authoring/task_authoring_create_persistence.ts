import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export interface TaskAuthoringReadinessAuditInput {
  readonly assessmentInput: Record<string, unknown>
  readonly inputHash: `sha256:${string}`
  readonly resultHash: `sha256:${string}`
  readonly result: TaskReadinessResultV1
}

export interface PersistInitialTaskSpecificationInput {
  readonly organizationId: string
  readonly actorId: string
  readonly authoringMode: TaskAuthoringSummaryRecord['mode']
  readonly authoringIntent: TaskAuthoringSummaryRecord['intent']
  readonly idempotencyKey: string
  readonly requestHash: `sha256:${string}`
  readonly expectedHeadRevision: number
  readonly specification: TaskSpecificationVersionV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readinessAudit: TaskAuthoringReadinessAuditInput
  readonly contract?: TaskContractVersionV1
}

export interface PersistInitialTaskContractInput extends PersistInitialTaskSpecificationInput {
  readonly contract: TaskContractVersionV1
  readonly resolutionProvenance: TaskWorkContractResolutionResult['provenance']
}

export type PersistTaskAuthoringSpecificationVersionInput = PersistInitialTaskSpecificationInput
export type PersistTaskAuthoringContractVersionInput = PersistInitialTaskContractInput

export interface TaskAuthoringCreatePersistence {
  persistInitialDraft(
    input: PersistInitialTaskSpecificationInput,
    trx: TaskTransaction
  ): Promise<void>

  persistInitialContract(
    input: PersistInitialTaskContractInput,
    trx: TaskTransaction
  ): Promise<void>

  persistVersionDraft(
    input: PersistTaskAuthoringSpecificationVersionInput,
    trx: TaskTransaction
  ): Promise<void>

  persistVersionContract(
    input: PersistTaskAuthoringContractVersionInput,
    trx: TaskTransaction
  ): Promise<void>
}
