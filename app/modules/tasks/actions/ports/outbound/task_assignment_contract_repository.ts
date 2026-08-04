import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type {
  AssignmentAcknowledgementContext,
  AssignmentAcknowledgementFact,
  AssignmentClarificationRequestFact,
} from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'

export type TaskAssignmentAcknowledgementState =
  | 'not_required'
  | 'pending'
  | 'acknowledged'
  | 'clarification_requested'

export interface TaskAssignmentContractSnapshotRecord {
  readonly id: string
  readonly assignmentId: string
  readonly taskId: string
  readonly sequence: number
  readonly previousSnapshotId: string | null
  readonly envelope: CanonicalTaskAssignmentContractSnapshotV1
  readonly snapshotHash: `sha256:${string}`
  readonly acknowledgementRequired: boolean
  readonly acknowledgementState: TaskAssignmentAcknowledgementState
  readonly idempotencyKey: string
  readonly replayed: boolean
}

export interface PersistTaskAssignmentContractSnapshotInput {
  readonly envelope: CanonicalTaskAssignmentContractSnapshotV1
  readonly idempotencyKey: string
  readonly expectedHeadRevision: number
}

export interface PersistTaskAssignmentAcknowledgementInput {
  readonly fact: AssignmentAcknowledgementFact
  readonly idempotencyKey: string
  readonly requestHash: `sha256:${string}`
}

export interface PersistTaskAssignmentClarificationInput {
  readonly request: AssignmentClarificationRequestFact
  readonly reason: string
  readonly idempotencyKey: string
  readonly requestHash: `sha256:${string}`
}

export interface TaskAssignmentInteractionReplayLookupInput {
  readonly actorId: string
  readonly assignmentId: string
  readonly snapshotId: string
  readonly snapshotHash: string
  readonly contractVersionHead: number
  readonly idempotencyKey: string
  readonly requestHash: `sha256:${string}`
}

export interface TaskAssignmentInteractionPersistenceResult<TFact> {
  readonly fact: TFact
  readonly replayed: boolean
}

export interface TaskAssignmentContractRepository {
  persistSnapshot(
    input: PersistTaskAssignmentContractSnapshotInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord>

  findCurrent(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord | null>

  findHistory(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<readonly TaskAssignmentContractSnapshotRecord[]>

  lockInteractionContext(
    assignmentId: string,
    transaction: TaskTransaction
  ): Promise<AssignmentAcknowledgementContext | null>

  findAcknowledgementReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentInteractionPersistenceResult<AssignmentAcknowledgementFact> | null>

  findClarificationReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentInteractionPersistenceResult<AssignmentClarificationRequestFact> | null>

  persistAcknowledgement(
    input: PersistTaskAssignmentAcknowledgementInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentInteractionPersistenceResult<AssignmentAcknowledgementFact>>

  persistClarification(
    input: PersistTaskAssignmentClarificationInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentInteractionPersistenceResult<AssignmentClarificationRequestFact>>
}
