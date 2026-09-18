import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { NodeTaskContractContentHasher } from '../task-submissions/node_task_contract_content_hasher.js'

import { lucidTransaction } from './task_assignment_contract_invariants.js'
import { loadTaskAssignmentHistory } from './task_assignment_history_loader.js'
import { TaskAssignmentInteractionPersistence } from './task_assignment_interaction_persistence.js'
import { TaskAssignmentSnapshotWriter } from './task_assignment_snapshot_writer.js'

import type {
  PersistTaskAssignmentAcknowledgementInput,
  PersistTaskAssignmentClarificationInput,
  PersistTaskAssignmentContractSnapshotInput,
  TaskAssignmentContractRepository,
  TaskAssignmentContractSnapshotRecord,
  TaskAssignmentInteractionReplayLookupInput,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'

export class LucidTaskAssignmentContractRepository implements TaskAssignmentContractRepository {
  private readonly snapshotWriter: TaskAssignmentSnapshotWriter
  private readonly interactionPersistence: TaskAssignmentInteractionPersistence

  constructor(
    private readonly hasher: TaskContractContentHasher = new NodeTaskContractContentHasher()
  ) {
    this.snapshotWriter = new TaskAssignmentSnapshotWriter(this.hasher)
    this.interactionPersistence = new TaskAssignmentInteractionPersistence(this.hasher)
  }

  async persistSnapshot(
    input: PersistTaskAssignmentContractSnapshotInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord> {
    return this.snapshotWriter.persistSnapshot(
      input,
      transaction,
      (assignmentId, trx, knownHead) => this.loadHistory(assignmentId, trx, knownHead)
    )
  }

  async findCurrent(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord | null> {
    const history = await this.loadHistory(assignmentId, lucidTransaction(transaction))
    return history.at(-1) ?? null
  }

  async findHistory(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<readonly TaskAssignmentContractSnapshotRecord[]> {
    return this.loadHistory(assignmentId, lucidTransaction(transaction))
  }

  async findAcknowledgementReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    return this.interactionPersistence.findAcknowledgementReplay(input, transaction)
  }

  async findClarificationReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    return this.interactionPersistence.findClarificationReplay(input, transaction)
  }

  async lockInteractionContext(assignmentId: string, transaction: TaskTransaction) {
    return this.interactionPersistence.lockInteractionContext(
      assignmentId,
      transaction,
      (aId, trx, knownHead) => this.loadHistory(aId, trx, knownHead)
    )
  }

  async persistAcknowledgement(
    input: PersistTaskAssignmentAcknowledgementInput,
    transaction: TaskTransaction
  ) {
    return this.interactionPersistence.persistAcknowledgement(
      input,
      transaction,
      (assignmentId, trx, knownHead) => this.loadHistory(assignmentId, trx, knownHead)
    )
  }

  async persistClarification(
    input: PersistTaskAssignmentClarificationInput,
    transaction: TaskTransaction
  ) {
    return this.interactionPersistence.persistClarification(
      input,
      transaction,
      (assignmentId, trx, knownHead) => this.loadHistory(assignmentId, trx, knownHead)
    )
  }

  private async loadHistory(
    assignmentId: string,
    trx?: TransactionClientContract,
    knownHead?: TaskAssignmentContractHead | null
  ): Promise<TaskAssignmentContractSnapshotRecord[]> {
    return loadTaskAssignmentHistory(assignmentId, this.hasher, trx, knownHead)
  }
}
