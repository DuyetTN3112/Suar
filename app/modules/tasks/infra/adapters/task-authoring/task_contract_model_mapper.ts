import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import {
  isTaskContractVersionV1,
  isTaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import type TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import type TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import type TaskSupportingReference from '#modules/tasks/infra/models/task-requirements/task_supporting_reference'

function requiredIsoTimestamp(value: { toUTC(): { toISO(): string | null } }, field: string): string {
  const timestamp = value.toUTC().toISO()
  if (!timestamp) {
    throw new InvariantViolationException(`${field} has an invalid timestamp`)
  }
  return timestamp
}

export function mapTaskSpecificationVersionModel(
  model: TaskSpecificationVersion
): TaskSpecificationVersionV1 {
  const specification = {
    schemaVersion: model.schema_version,
    id: model.id,
    taskId: model.task_id,
    versionNumber: model.version_number,
    richContent: model.rich_content,
    plainTextProjection: model.plain_text_projection,
    sectionIndex: model.section_index,
    projectContextVersionId: model.project_context_version_id,
    workPackageVersionId: model.work_package_version_id,
    authorId: model.author_id,
    confirmationState: model.confirmation_state,
    contentHash: model.content_hash,
    changeClass: model.change_class,
    changeReason: model.change_reason,
    sourceProvenance: model.source_provenance,
    createdAt: requiredIsoTimestamp(model.created_at, 'Task Specification created_at'),
  }
  if (!isTaskSpecificationVersionV1(specification)) {
    throw new InvariantViolationException(
      'Persisted Task Specification has an unsupported or invalid schema'
    )
  }

  return specification
}

export function mapTaskContractVersionModel(model: TaskContractVersion): TaskContractVersionV1 {
  const contract = {
    schemaVersion: model.schema_version,
    id: model.id,
    taskId: model.task_id,
    taskSpecificationVersionId: model.task_specification_version_id,
    versionNumber: model.version_number,
    workContract: model.work_contract,
    evidenceContract: model.evidence_contract,
    resolvedContract: model.resolved_contract,
    readinessState: model.readiness_state,
    creatorConfirmedBy: model.creator_confirmed_by,
    creatorConfirmedAt: model.creator_confirmed_at
      ? requiredIsoTimestamp(model.creator_confirmed_at, 'Task Contract creator_confirmed_at')
      : null,
    contentHash: model.content_hash,
    changeClass: model.change_class,
    changeReason: model.change_reason,
    effectiveFrom: requiredIsoTimestamp(model.effective_from, 'Task Contract effective_from'),
    createdAt: requiredIsoTimestamp(model.created_at, 'Task Contract created_at'),
  }
  if (!isTaskContractVersionV1(contract)) {
    throw new InvariantViolationException(
      'Persisted Task Contract has an unsupported or invalid schema'
    )
  }

  return contract
}

export function mapTaskSupportingReferenceModel(
  model: TaskSupportingReference
): TaskSupportingReferenceV1 {
  return {
    id: model.reference_id,
    type: model.type,
    uri: model.uri,
    title: model.title,
    relevantSection: model.relevant_section,
    relation: model.relation,
    accessState: model.access_state,
    privacyClassification: model.privacy_classification,
    externalVersion: model.external_version,
    externalContentHash: model.external_content_hash,
    addedBy: model.added_by,
    addedAt: requiredIsoTimestamp(model.added_at, 'Task Supporting Reference added_at'),
  }
}

export function mapTaskReadinessAssessmentModel(
  model: TaskReadinessAssessment
): TaskReadinessResultV1 {
  return {
    policyVersion: model.policy_version,
    workState: model.work_state,
    evidenceState: model.evidence_state,
    assignmentReady: model.assignment_ready,
    evidenceReady: model.evidence_ready,
    blockers: model.blockers,
    warnings: model.warnings,
    assessedAt: requiredIsoTimestamp(model.assessed_at, 'Task Readiness assessed_at'),
  }
}
