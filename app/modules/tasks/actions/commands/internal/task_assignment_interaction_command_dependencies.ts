import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskAssignmentInteractionCommandDependencies {
  readonly repository: TaskAssignmentContractRepository
  readonly transactions: TaskTransactionRunner
  readonly hasher: TaskContractContentHasher
  readonly clock: { nowIso(): string }
  readonly identityFactory: { nextId(): string }
}

export interface TaskAssignmentExpectedSnapshotDTO {
  readonly assignmentId: string
  readonly snapshotId: string
  readonly snapshotHash: string
  readonly contractVersionHead: number
  readonly idempotencyKey: string
}
