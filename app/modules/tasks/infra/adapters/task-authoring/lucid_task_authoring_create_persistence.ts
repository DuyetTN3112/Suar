import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isTvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/validators'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  PersistInitialTaskContractInput,
  PersistInitialTaskSpecificationInput,
  PersistTaskAuthoringContractVersionInput,
  PersistTaskAuthoringSpecificationVersionInput,
  TaskAuthoringCreatePersistence,
} from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_persistence'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { TaskAuthoringIdempotentReplay } from '#modules/tasks/domain/task-authoring/task_authoring_idempotency'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'

interface IdempotencyRow {
  readonly request_hash: string
  readonly task_id: string
  readonly task_specification_version_id: string
  readonly task_contract_version_id: string | null
}

function lucidTransaction(trx: TaskTransaction): TransactionClientContract {
  return trx as TransactionClientContract
}

function assessmentInput(value: Record<string, unknown>): TvaJsonObject {
  if (!isTvaJsonValue(value)) {
    throw ValidationException.field('readinessAudit.assessmentInput', 'Invalid JSON object')
  }
  return value
}

async function reserveIdempotencyKey(
  input: PersistInitialTaskSpecificationInput,
  trx: TransactionClientContract
): Promise<void> {
  const contractVersionId = input.contract?.id ?? null
  const inserted = await trx
    .table('task_authoring_idempotency_keys')
    .insert({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      idempotency_key: input.idempotencyKey,
      request_hash: input.requestHash,
      task_id: input.specification.taskId,
      task_specification_version_id: input.specification.id,
      task_contract_version_id: contractVersionId,
    })
    .onConflict(['organization_id', 'actor_id', 'idempotency_key'])
    .ignore()
    .returning('task_id')

  if (inserted.length === 1) {
    return
  }

  const existing = (await trx
    .from('task_authoring_idempotency_keys')
    .select(
      'request_hash',
      'task_id',
      'task_specification_version_id',
      'task_contract_version_id'
    )
    .where('organization_id', input.organizationId)
    .where('actor_id', input.actorId)
    .where('idempotency_key', input.idempotencyKey)
    .first()) as IdempotencyRow | undefined

  if (!existing) {
    throw new ConflictException('Task authoring idempotency reservation could not be resolved')
  }
  if (existing.request_hash !== input.requestHash) {
    throw new ConflictException('Task authoring idempotency key was reused with a different payload', {
      idempotencyKey: input.idempotencyKey,
    })
  }

  const readiness = await TaskReadinessAssessment.query({ client: trx })
    .where('task_id', existing.task_id)
    .where('task_specification_version_id', existing.task_specification_version_id)
    .first()
  if (!readiness) {
    throw new InvariantViolationException(
      'Completed Task authoring idempotency key is missing its readiness assessment'
    )
  }
  const assessedAt = readiness.assessed_at.toUTC().toISO()
  if (!assessedAt) {
    throw new InvariantViolationException(
      'Completed Task authoring readiness assessment has an invalid timestamp'
    )
  }

  throw new TaskAuthoringIdempotentReplay(
    existing.task_id,
    existing.task_specification_version_id,
    existing.task_contract_version_id,
    {
      mode: input.authoringMode,
      intent: input.authoringIntent,
      specificationVersionId: existing.task_specification_version_id,
      contractVersionId: existing.task_contract_version_id,
      headRevision: input.specification.versionNumber,
      readiness: {
        policyVersion: readiness.policy_version,
        workState: readiness.work_state,
        evidenceState: readiness.evidence_state,
        assignmentReady: readiness.assignment_ready,
        evidenceReady: readiness.evidence_ready,
        blockers: readiness.blockers,
        warnings: readiness.warnings,
        assessedAt,
      },
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
    }
  )
}

function expectedInitialHeadRevision(revision: number): null {
  if (revision !== 0) {
    throw new ConflictException('New Task authoring must start from head revision 0', {
      expectedHeadRevision: revision,
    })
  }
  return null
}

function expectedVersionHeadRevision(revision: number): number {
  if (revision < 1) {
    throw new ConflictException('Task authoring version requires an existing head revision', {
      expectedHeadRevision: revision,
    })
  }
  return revision
}

export class LucidTaskAuthoringCreatePersistence implements TaskAuthoringCreatePersistence {
  async persistInitialDraft(
    input: PersistInitialTaskSpecificationInput,
    transaction: TaskTransaction
  ): Promise<void> {
    const trx = lucidTransaction(transaction)
    await reserveIdempotencyKey(input, trx)
    await TaskSpecificationContractRepository.persistDraft(
      {
        specification: input.specification,
        supportingReferences: input.supportingReferences,
        readinessAudit: {
          ...input.readinessAudit,
          assessmentInput: assessmentInput(input.readinessAudit.assessmentInput),
        },
        expectedHeadRevision: expectedInitialHeadRevision(input.expectedHeadRevision),
      },
      trx
    )
  }

  async persistInitialContract(
    input: PersistInitialTaskContractInput,
    transaction: TaskTransaction
  ): Promise<void> {
    const trx = lucidTransaction(transaction)
    await reserveIdempotencyKey(input, trx)
    await TaskSpecificationContractRepository.persistContractBundle(
      {
        specification: input.specification,
        contract: input.contract,
        resolutionProvenance: input.resolutionProvenance,
        readinessAudit: {
          ...input.readinessAudit,
          assessmentInput: assessmentInput(input.readinessAudit.assessmentInput),
        },
        expectedHeadRevision: expectedInitialHeadRevision(input.expectedHeadRevision),
      },
      trx
    )
  }

  async persistVersionDraft(
    input: PersistTaskAuthoringSpecificationVersionInput,
    transaction: TaskTransaction
  ): Promise<void> {
    const trx = lucidTransaction(transaction)
    await reserveIdempotencyKey(input, trx)
    await TaskSpecificationContractRepository.persistDraft(
      {
        specification: input.specification,
        supportingReferences: input.supportingReferences,
        readinessAudit: {
          ...input.readinessAudit,
          assessmentInput: assessmentInput(input.readinessAudit.assessmentInput),
        },
        expectedHeadRevision: expectedVersionHeadRevision(input.expectedHeadRevision),
      },
      trx
    )
  }

  async persistVersionContract(
    input: PersistTaskAuthoringContractVersionInput,
    transaction: TaskTransaction
  ): Promise<void> {
    const trx = lucidTransaction(transaction)
    await reserveIdempotencyKey(input, trx)
    await TaskSpecificationContractRepository.persistContractBundle(
      {
        specification: input.specification,
        contract: input.contract,
        resolutionProvenance: input.resolutionProvenance,
        readinessAudit: {
          ...input.readinessAudit,
          assessmentInput: assessmentInput(input.readinessAudit.assessmentInput),
        },
        expectedHeadRevision: expectedVersionHeadRevision(input.expectedHeadRevision),
      },
      trx
    )
  }
}
