import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import TaskAuthoringHead from '#modules/tasks/infra/models/task-authoring/task_authoring_head'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import TaskEvidenceRequirement from '#modules/tasks/infra/models/task-requirements/task_evidence_requirement'
import TaskSupportingReference from '#modules/tasks/infra/models/task-requirements/task_supporting_reference'
import {
  taskSupportingReferenceFingerprint,
  taskSupportingReferenceUriHash,
} from '#modules/tasks/infra/repositories/task-authoring/task_supporting_reference_fingerprint'
import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import {
  explainTaskContractVersionV1,
  isTaskContractVersionV1,
  isTaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

export interface TaskReadinessAuditPersistenceInput {
  readonly assessmentInput: TvaJsonObject
  readonly inputHash: TvaSha256
  readonly resultHash: TvaSha256
  readonly result: TaskReadinessResultV1
}

export interface PersistTaskSpecificationDraftInput {
  readonly specification: TaskSpecificationVersionV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readinessAudit: TaskReadinessAuditPersistenceInput
  readonly expectedHeadRevision: number | null
}

export interface PersistTaskSpecificationContractBundleInput {
  readonly specification: TaskSpecificationVersionV1
  readonly contract: TaskContractVersionV1
  readonly resolutionProvenance?: TaskWorkContractResolutionResult['provenance']
  readonly readinessAudit: TaskReadinessAuditPersistenceInput
  readonly expectedHeadRevision: number | null
}

export interface PersistedTaskSpecificationDraft {
  readonly specification: TaskSpecificationVersion
  readonly supportingReferences: readonly TaskSupportingReference[]
  readonly readinessAssessment: TaskReadinessAssessment
  readonly head: TaskAuthoringHead
}

export interface PersistedTaskSpecificationContractBundle extends PersistedTaskSpecificationDraft {
  readonly contract: TaskContractVersion
  readonly evidenceRequirements: readonly TaskEvidenceRequirement[]
}

export interface CurrentTaskSpecificationContractBundle {
  readonly head: TaskAuthoringHead
  readonly specification: TaskSpecificationVersion
  readonly contract: TaskContractVersion | null
  readonly supportingReferences: readonly TaskSupportingReference[]
  readonly evidenceRequirements: readonly TaskEvidenceRequirement[]
  readonly latestReadinessAssessment: TaskReadinessAssessment | null
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson)
  }

  if (value !== null && typeof value === 'object') {
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const child = (value as Record<string, unknown>)[key]
      if (child !== undefined) {
        normalized[key] = canonicalizeJson(child)
      }
    }
    return normalized
  }

  return value
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right))
}

function assertSpecificationContractLinkage(
  specification: TaskSpecificationVersionV1,
  contract: TaskContractVersionV1
): void {
  const resolved = contract.resolvedContract
  const linkageIsConsistent =
    contract.taskId === specification.taskId &&
    contract.taskSpecificationVersionId === specification.id &&
    resolved.taskId === specification.taskId &&
    resolved.versionId === contract.id &&
    resolved.specification.versionId === specification.id &&
    resolved.specification.plainText === specification.plainTextProjection &&
    resolved.inheritedFrom.projectContextVersionId === specification.projectContextVersionId &&
    resolved.inheritedFrom.workPackageVersionId === specification.workPackageVersionId &&
    sameJson(resolved.specification.richContent, specification.richContent) &&
    sameJson(resolved.specification.sections, specification.sectionIndex) &&
    sameJson(resolved.work, contract.workContract) &&
    sameJson(resolved.evidence, contract.evidenceContract)

  if (!linkageIsConsistent) {
    throw new InvariantViolationException(
      'Task Contract persistence received inconsistent specification, inheritance, or resolved pins'
    )
  }
}

function assertReadinessAudit(
  readinessAudit: TaskReadinessAuditPersistenceInput,
  expectedResult?: TaskReadinessResultV1
): void {
  if (expectedResult !== undefined && !sameJson(readinessAudit.result, expectedResult)) {
    throw new InvariantViolationException(
      'Task readiness audit result does not match the resolved Contract readiness result'
    )
  }
}

function assertUniqueReferenceSemantics(references: readonly TaskSupportingReferenceV1[]): void {
  const ids = new Set<string>()
  const fingerprints = new Set<string>()

  for (const reference of references) {
    const fingerprint = taskSupportingReferenceFingerprint(reference)
    if (ids.has(reference.id) || fingerprints.has(fingerprint)) {
      throw ValidationException.field(
        'supportingReferences',
        'Duplicate Supporting Reference in the same Task Specification version'
      )
    }
    ids.add(reference.id)
    fingerprints.add(fingerprint)
  }
}

function specificationPayload(specification: TaskSpecificationVersionV1) {
  return {
    id: specification.id,
    schema_version: specification.schemaVersion,
    task_id: specification.taskId,
    version_number: specification.versionNumber,
    rich_content: specification.richContent,
    plain_text_projection: specification.plainTextProjection,
    section_index: specification.sectionIndex,
    project_context_version_id: specification.projectContextVersionId,
    work_package_version_id: specification.workPackageVersionId,
    author_id: specification.authorId,
    confirmation_state: specification.confirmationState,
    content_hash: specification.contentHash,
    change_class: specification.changeClass,
    change_reason: specification.changeReason ?? null,
    source_provenance: specification.sourceProvenance,
    created_at: DateTime.fromISO(specification.createdAt),
  }
}

function contractPayload(
  contract: TaskContractVersionV1,
  resolutionProvenance: TaskWorkContractResolutionResult['provenance'] = {}
) {
  return {
    id: contract.id,
    schema_version: contract.schemaVersion,
    task_id: contract.taskId,
    task_specification_version_id: contract.taskSpecificationVersionId,
    version_number: contract.versionNumber,
    work_contract: contract.workContract,
    evidence_contract: contract.evidenceContract,
    resolved_contract: contract.resolvedContract,
    resolution_provenance: resolutionProvenance,
    readiness_state: contract.readinessState,
    creator_confirmed_by: contract.creatorConfirmedBy,
    creator_confirmed_at:
      contract.creatorConfirmedAt === null ? null : DateTime.fromISO(contract.creatorConfirmedAt),
    content_hash: contract.contentHash,
    change_class: contract.changeClass,
    change_reason: contract.changeReason ?? null,
    effective_from: DateTime.fromISO(contract.effectiveFrom),
    created_at: DateTime.fromISO(contract.createdAt),
  }
}

async function createSupportingReferences(
  taskId: string,
  specificationVersionId: string,
  references: readonly TaskSupportingReferenceV1[],
  trx: TransactionClientContract
): Promise<TaskSupportingReference[]> {
  const persisted: TaskSupportingReference[] = []
  for (const reference of references) {
    persisted.push(
      await TaskSupportingReference.create(
        {
          reference_id: reference.id,
          task_id: taskId,
          task_specification_version_id: specificationVersionId,
          type: reference.type,
          uri: reference.uri,
          uri_hash: taskSupportingReferenceUriHash(reference.uri),
          title: reference.title,
          relevant_section: reference.relevantSection,
          relation: reference.relation,
          access_state: reference.accessState,
          privacy_classification: reference.privacyClassification,
          external_version: reference.externalVersion,
          external_content_hash: reference.externalContentHash,
          added_by: reference.addedBy,
          added_at: DateTime.fromISO(reference.addedAt),
          reference_fingerprint: taskSupportingReferenceFingerprint(reference),
        },
        { client: trx }
      )
    )
  }
  return persisted
}

async function createEvidenceRequirements(
  contract: TaskContractVersionV1,
  trx: TransactionClientContract
): Promise<TaskEvidenceRequirement[]> {
  const persisted: TaskEvidenceRequirement[] = []
  for (const [ordinal, requirement] of contract.evidenceContract.requirements.entries()) {
    persisted.push(
      await TaskEvidenceRequirement.create(
        {
          evidence_requirement_id: requirement.id,
          task_id: contract.taskId,
          task_contract_version_id: contract.id,
          type: requirement.type,
          title: requirement.title,
          description: requirement.description,
          criterion_ids: requirement.criterionIds,
          deliverable_ids: requirement.deliverableIds,
          required: requirement.required,
          privacy_classification: requirement.privacyClassification,
          ordinal,
        },
        { client: trx }
      )
    )
  }
  return persisted
}

async function createReadinessAssessment(
  input: {
    taskId: string
    specificationVersionId: string
    contractVersionId: string | null
    readinessAudit: TaskReadinessAuditPersistenceInput
  },
  trx: TransactionClientContract
): Promise<TaskReadinessAssessment> {
  const { result } = input.readinessAudit
  return TaskReadinessAssessment.create(
    {
      task_id: input.taskId,
      task_specification_version_id: input.specificationVersionId,
      task_contract_version_id: input.contractVersionId,
      policy_version: result.policyVersion,
      assessment_input: input.readinessAudit.assessmentInput,
      input_hash: input.readinessAudit.inputHash,
      work_state: result.workState,
      evidence_state: result.evidenceState,
      assignment_ready: result.assignmentReady,
      evidence_ready: result.evidenceReady,
      blockers: result.blockers,
      warnings: result.warnings,
      result_hash: input.readinessAudit.resultHash,
      assessed_at: DateTime.fromISO(result.assessedAt),
    },
    { client: trx }
  )
}

async function assertPointerTargetExists(
  taskId: string,
  specificationVersionId: string,
  contractVersionId: string | null,
  trx: TransactionClientContract
): Promise<void> {
  const specification = await TaskSpecificationVersion.query({ client: trx })
    .where('id', specificationVersionId)
    .where('task_id', taskId)
    .first()

  if (!specification) {
    throw new InvariantViolationException(
      'Task authoring head cannot point to a missing or cross-task Specification version'
    )
  }

  if (typeof contractVersionId === 'string') {
    const contract = await TaskContractVersion.query({ client: trx })
      .where('id', contractVersionId)
      .where('task_id', taskId)
      .first()
    if (!contract) {
      throw new InvariantViolationException(
        'Task authoring head cannot point to a missing or cross-task Contract version'
      )
    }
  }
}

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
