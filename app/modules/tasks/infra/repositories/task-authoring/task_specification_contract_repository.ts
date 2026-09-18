import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  contractPayload,
  createEvidenceRequirements,
  createReadinessAssessment,
  createSupportingReferences,
  specificationPayload,
} from './task_specification_contract_entity_mappers.js'
import {
  assertPointerTargetExists,
  assertReadinessAudit,
  assertSpecificationContractLinkage,
  assertUniqueReferenceSemantics,
} from './task_specification_contract_invariants.js'
import type {
  CurrentTaskSpecificationContractBundle,
  PersistedTaskSpecificationContractBundle,
  PersistedTaskSpecificationDraft,
  PersistTaskSpecificationContractBundleInput,
  PersistTaskSpecificationDraftInput,
} from './task_specification_contract_types.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import TaskAuthoringHead from '#modules/tasks/infra/models/task-authoring/task_authoring_head'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import TaskEvidenceRequirement from '#modules/tasks/infra/models/task-requirements/task_evidence_requirement'
import TaskSupportingReference from '#modules/tasks/infra/models/task-requirements/task_supporting_reference'
import {
  explainTaskContractVersionV1,
  isTaskContractVersionV1,
  isTaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

// Re-export types and invariants for backward compatibility
export type {
  CurrentTaskSpecificationContractBundle,
  PersistedTaskSpecificationContractBundle,
  PersistedTaskSpecificationDraft,
  PersistTaskSpecificationContractBundleInput,
  PersistTaskSpecificationDraftInput,
  TaskReadinessAuditPersistenceInput,
} from './task_specification_contract_types.js'
export {
  assertPointerTargetExists,
  assertReadinessAudit,
  assertSpecificationContractLinkage,
  assertUniqueReferenceSemantics,
  canonicalizeJson,
  sameJson,
} from './task_specification_contract_invariants.js'

async function lockAndAssertExpectedAuthoringHead(
  taskId: string,
  expectedRevision: number | null,
  trx: TransactionClientContract
): Promise<void> {
  if (expectedRevision === null) {
    return
  }

  const head = await TaskAuthoringHead.query({ client: trx })
    .where('task_id', taskId)
    .forUpdate()
    .first()
  if (!head || head.revision !== expectedRevision) {
    throw new ConflictException('Task authoring version changed; reload before saving', {
      taskId,
      expectedRevision,
      actualRevision: head?.revision ?? null,
    })
  }
}

async function advanceAuthoringHead(
  input: {
    taskId: string
    specificationVersionId: string
    contractVersionId: string | null
    expectedRevision: number | null
  },
  trx: TransactionClientContract
): Promise<TaskAuthoringHead> {
  await assertPointerTargetExists(
    input.taskId,
    input.specificationVersionId,
    input.contractVersionId,
    trx
  )

  if (input.expectedRevision === null) {
    return TaskAuthoringHead.create(
      {
        task_id: input.taskId,
        current_specification_version_id: input.specificationVersionId,
        current_contract_version_id: input.contractVersionId,
        revision: 1,
      },
      { client: trx }
    )
  }

  const updatePayload: Record<string, unknown> = {
    current_specification_version_id: input.specificationVersionId,
    revision: input.expectedRevision + 1,
    updated_at: new Date(),
  }
  updatePayload['current_contract_version_id'] = input.contractVersionId

  const updatedRows = await trx
    .from('task_authoring_heads')
    .where('task_id', input.taskId)
    .where('revision', input.expectedRevision)
    .update(updatePayload)
    .returning('task_id')

  if (updatedRows.length !== 1) {
    throw new ConflictException('Task authoring version changed; reload before saving', {
      taskId: input.taskId,
      expectedRevision: input.expectedRevision,
    })
  }

  return TaskAuthoringHead.query({ client: trx }).where('task_id', input.taskId).firstOrFail()
}

export default class TaskSpecificationContractRepository {
  static async persistDraft(
    input: PersistTaskSpecificationDraftInput,
    trx: TransactionClientContract
  ): Promise<PersistedTaskSpecificationDraft> {
    if (!isTaskSpecificationVersionV1(input.specification)) {
      throw ValidationException.field(
        'specification',
        'Task Specification does not satisfy the supported versioned contract'
      )
    }
    assertUniqueReferenceSemantics(input.supportingReferences)
    assertReadinessAudit(input.readinessAudit)
    await lockAndAssertExpectedAuthoringHead(
      input.specification.taskId,
      input.expectedHeadRevision,
      trx
    )

    const specification = await TaskSpecificationVersion.create(
      specificationPayload(input.specification),
      { client: trx }
    )
    const supportingReferences = await createSupportingReferences(
      input.specification.taskId,
      input.specification.id,
      input.supportingReferences,
      trx
    )
    const readinessAssessment = await createReadinessAssessment(
      {
        taskId: input.specification.taskId,
        specificationVersionId: input.specification.id,
        contractVersionId: null,
        readinessAudit: input.readinessAudit,
      },
      trx
    )
    const head = await advanceAuthoringHead(
      {
        taskId: input.specification.taskId,
        specificationVersionId: input.specification.id,
        contractVersionId: null,
        expectedRevision: input.expectedHeadRevision,
      },
      trx
    )

    return { specification, supportingReferences, readinessAssessment, head }
  }

  static async persistContractBundle(
    input: PersistTaskSpecificationContractBundleInput,
    trx: TransactionClientContract
  ): Promise<PersistedTaskSpecificationContractBundle> {
    if (!isTaskSpecificationVersionV1(input.specification)) {
      throw ValidationException.field(
        'specification',
        'Task Specification does not satisfy the supported versioned contract'
      )
    }
    if (!isTaskContractVersionV1(input.contract)) {
      throw ValidationException.field(
        'contract',
        `Task Contract does not satisfy the supported versioned contract (${explainTaskContractVersionV1(input.contract).join(', ') || 'unknown'})`
      )
    }

    assertSpecificationContractLinkage(input.specification, input.contract)
    assertUniqueReferenceSemantics(input.contract.resolvedContract.supportingReferences)
    assertReadinessAudit(input.readinessAudit, input.contract.resolvedContract.readiness)
    await lockAndAssertExpectedAuthoringHead(
      input.specification.taskId,
      input.expectedHeadRevision,
      trx
    )

    const specification = await TaskSpecificationVersion.create(
      specificationPayload(input.specification),
      { client: trx }
    )
    const contract = await TaskContractVersion.create(
      contractPayload(input.contract, input.resolutionProvenance),
      {
        client: trx,
      }
    )
    const supportingReferences = await createSupportingReferences(
      input.specification.taskId,
      input.specification.id,
      input.contract.resolvedContract.supportingReferences,
      trx
    )
    const evidenceRequirements = await createEvidenceRequirements(input.contract, trx)
    const readinessAssessment = await createReadinessAssessment(
      {
        taskId: input.specification.taskId,
        specificationVersionId: input.specification.id,
        contractVersionId: input.contract.id,
        readinessAudit: input.readinessAudit,
      },
      trx
    )
    const head = await advanceAuthoringHead(
      {
        taskId: input.specification.taskId,
        specificationVersionId: input.specification.id,
        contractVersionId: input.contract.id,
        expectedRevision: input.expectedHeadRevision,
      },
      trx
    )

    return {
      specification,
      contract,
      supportingReferences,
      evidenceRequirements,
      readinessAssessment,
      head,
    }
  }

  static async findCurrent(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<CurrentTaskSpecificationContractBundle | null> {
    const headQuery = trx ? TaskAuthoringHead.query({ client: trx }) : TaskAuthoringHead.query()
    const head = await headQuery.where('task_id', taskId).first()
    if (!head) {
      return null
    }

    const specificationQuery = trx
      ? TaskSpecificationVersion.query({ client: trx })
      : TaskSpecificationVersion.query()
    const specification = await specificationQuery
      .where('id', head.current_specification_version_id)
      .where('task_id', taskId)
      .first()
    if (!specification) {
      throw new InvariantViolationException(
        'Task authoring head references a missing current Specification version'
      )
    }

    const contract = head.current_contract_version_id
      ? await (trx ? TaskContractVersion.query({ client: trx }) : TaskContractVersion.query())
          .where('id', head.current_contract_version_id)
          .where('task_id', taskId)
          .first()
      : null
    if (head.current_contract_version_id && !contract) {
      throw new InvariantViolationException(
        'Task authoring head references a missing current Contract version'
      )
    }

    const supportingReferences = await (
      trx ? TaskSupportingReference.query({ client: trx }) : TaskSupportingReference.query()
    )
      .where('task_specification_version_id', specification.id)
      .orderBy('added_at', 'asc')
      .orderBy('id', 'asc')

    const evidenceRequirements = contract
      ? await (
          trx ? TaskEvidenceRequirement.query({ client: trx }) : TaskEvidenceRequirement.query()
        )
          .where('task_contract_version_id', contract.id)
          .orderBy('ordinal', 'asc')
      : []

    const readinessQuery = trx
      ? TaskReadinessAssessment.query({ client: trx })
      : TaskReadinessAssessment.query()
    const latestReadinessAssessment = await readinessQuery
      .where('task_specification_version_id', specification.id)
      .if(contract !== null, (query) => query.where('task_contract_version_id', contract?.id ?? ''))
      .if(contract === null, (query) => query.whereNull('task_contract_version_id'))
      .orderBy('assessed_at', 'desc')
      .orderBy('id', 'desc')
      .first()

    return {
      head,
      specification,
      contract,
      supportingReferences,
      evidenceRequirements,
      latestReadinessAssessment,
    }
  }
}
