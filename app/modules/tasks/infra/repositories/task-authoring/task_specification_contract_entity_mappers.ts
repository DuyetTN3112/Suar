import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import type { TaskReadinessAuditPersistenceInput } from './task_specification_contract_types.js'

import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskEvidenceRequirement from '#modules/tasks/infra/models/task-requirements/task_evidence_requirement'
import TaskSupportingReference from '#modules/tasks/infra/models/task-requirements/task_supporting_reference'
import {
  taskSupportingReferenceFingerprint,
  taskSupportingReferenceUriHash,
} from '#modules/tasks/infra/repositories/task-authoring/task_supporting_reference_fingerprint'
import type {
  TaskContractVersionV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export function specificationPayload(specification: TaskSpecificationVersionV1) {
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

export function contractPayload(
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

export async function createSupportingReferences(
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

export async function createEvidenceRequirements(
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

export async function createReadinessAssessment(
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
