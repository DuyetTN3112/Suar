import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  CompletionEvidenceManifestInput,
  PersistTaskCompletionReportInput,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import type {
  CompletionContributorClaimInput,
  CompletionCriterionResultInput,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import {
  TVA_AUTONOMY_LEVELS,
  TVA_CRITERION_RESULTS,
  TVA_OWNERSHIP_LEVELS,
  TVA_PRIVACY_CLASSIFICATIONS,
  type TvaJsonObject,
  type TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

type Body = Record<string, unknown>

function read(value: Body, camelCaseKey: string, snakeCaseKey = camelCaseKey): unknown {
  return value[camelCaseKey] ?? value[snakeCaseKey]
}

function asObject(value: unknown, field: string): Body {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ValidationException.field(field, `${field} must be an object`)
  }
  return value as Body
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }
  return value
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw ValidationException.field(field, `${field} must be a string`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw ValidationException.field(field, `${field} must be a string or null`)
  }
  return value
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw ValidationException.field(field, `${field} must be an array of strings`)
  }
  return value as string[]
}

function jsonObject(value: unknown, field: string): TvaJsonObject {
  return asObject(value ?? {}, field) as TvaJsonObject
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  fallback: T[number]
): T[number] {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw ValidationException.field(field, `${field} contains an unsupported value`)
  }
  return value
}

function nullableEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string
): T[number] | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw ValidationException.field(field, `${field} contains an unsupported value`)
  }
  return value
}

function sha256(value: unknown, field: string): TvaSha256 {
  const parsed = requiredString(value, field)
  if (!/^sha256:[0-9a-f]{64}$/.test(parsed)) {
    throw ValidationException.field(field, `${field} must be a sha256 digest`)
  }
  return parsed as TvaSha256
}

function mapCriterionResult(value: unknown, index: number): CompletionCriterionResultInput {
  const source = asObject(value, `report.criterionResults.${index}`)
  const field = (name: string) => `report.criterionResults.${index}.${name}`
  return {
    id: requiredString(read(source, 'id'), field('id')),
    criterionId: requiredString(read(source, 'criterionId', 'criterion_id'), field('criterionId')),
    expectedOutcome: requiredString(
      read(source, 'expectedOutcome', 'expected_outcome'),
      field('expectedOutcome')
    ),
    actualOutcome: requiredString(
      read(source, 'actualOutcome', 'actual_outcome'),
      field('actualOutcome')
    ),
    result: enumValue(
      read(source, 'result'),
      TVA_CRITERION_RESULTS,
      field('result'),
      'not_met'
    ),
    explanation: requiredString(read(source, 'explanation'), field('explanation')),
    evidenceIds: stringArray(read(source, 'evidenceIds', 'evidence_ids'), field('evidenceIds')),
    deviationStatus: enumValue(
      read(source, 'deviationStatus', 'deviation_status'),
      ['none', 'reported', 'approved', 'governed_exception'] as const,
      field('deviationStatus'),
      'none'
    ),
    deviationSummary: optionalString(
      read(source, 'deviationSummary', 'deviation_summary'),
      field('deviationSummary')
    ),
    deviationApprovalRef: optionalString(
      read(source, 'deviationApprovalRef', 'deviation_approval_ref'),
      field('deviationApprovalRef')
    ),
    notApplicableReason: optionalString(
      read(source, 'notApplicableReason', 'not_applicable_reason'),
      field('notApplicableReason')
    ),
    notApplicablePolicyRef: optionalString(
      read(source, 'notApplicablePolicyRef', 'not_applicable_policy_ref'),
      field('notApplicablePolicyRef')
    ),
  }
}

function mapEvidence(value: unknown, index: number) {
  const source = asObject(value, `report.evidence.${index}`)
  const field = (name: string) => `report.evidence.${index}.${name}`
  return {
    id: requiredString(read(source, 'id'), field('id')),
    evidenceRequirementIds: stringArray(
      read(source, 'evidenceRequirementIds', 'evidence_requirement_ids'),
      field('evidenceRequirementIds')
    ),
    criterionIds: stringArray(read(source, 'criterionIds', 'criterion_ids'), field('criterionIds')),
    deliverableIds: stringArray(
      read(source, 'deliverableIds', 'deliverable_ids'),
      field('deliverableIds')
    ),
    ownerUserId: requiredString(read(source, 'ownerUserId', 'owner_user_id'), field('ownerUserId')),
    contributorUserIds: stringArray(
      read(source, 'contributorUserIds', 'contributor_user_ids'),
      field('contributorUserIds')
    ),
    reviewerAccessState: enumValue(
      read(source, 'reviewerAccessState', 'reviewer_access_state'),
      ['available', 'restricted', 'unavailable', 'unknown'] as const,
      field('reviewerAccessState'),
      'unknown'
    ),
    availability: enumValue(
      read(source, 'availability'),
      ['available', 'partially_available', 'unavailable', 'not_disclosed'] as const,
      field('availability'),
      'not_disclosed'
    ),
    privacyClassification: enumValue(
      read(source, 'privacyClassification', 'privacy_classification'),
      TVA_PRIVACY_CLASSIFICATIONS,
      field('privacyClassification'),
      'internal'
    ),
  }
}

function mapClaim(value: unknown, index: number): CompletionContributorClaimInput {
  const source = asObject(value, `report.contributorClaims.${index}`)
  const field = (name: string) => `report.contributorClaims.${index}.${name}`
  return {
    id: requiredString(read(source, 'id'), field('id')),
    contributorUserId: requiredString(
      read(source, 'contributorUserId', 'contributor_user_id'),
      field('contributorUserId')
    ),
    action: requiredString(read(source, 'action'), field('action')),
    object: requiredString(read(source, 'object'), field('object')),
    actualRole: requiredString(read(source, 'actualRole', 'actual_role'), field('actualRole')),
    actualOwnership: nullableEnumValue(
      read(source, 'actualOwnership', 'actual_ownership'),
      TVA_OWNERSHIP_LEVELS,
      field('actualOwnership')
    ),
    contributionStatement: requiredString(
      read(source, 'contributionStatement', 'contribution_statement'),
      field('contributionStatement')
    ),
    deliverableIds: stringArray(
      read(source, 'deliverableIds', 'deliverable_ids'),
      field('deliverableIds')
    ),
    criterionResultIds: stringArray(
      read(source, 'criterionResultIds', 'criterion_result_ids'),
      field('criterionResultIds')
    ),
    evidenceIds: stringArray(read(source, 'evidenceIds', 'evidence_ids'), field('evidenceIds')),
  }
}

function mapReport(value: unknown, assignmentId: string): PersistTaskCompletionReportInput['report'] {
  const source = asObject(value, 'report')
  const taskAssignmentId = requiredString(
    read(source, 'taskAssignmentId', 'task_assignment_id'),
    'report.taskAssignmentId'
  )
  if (taskAssignmentId !== assignmentId) {
    throw ValidationException.field('report.taskAssignmentId', 'Assignment route does not match report')
  }

  const criterionResults = read(source, 'criterionResults', 'criterion_results')
  const evidence = read(source, 'evidence')
  const contributorClaims = read(source, 'contributorClaims', 'contributor_claims')

  if (criterionResults !== undefined && !Array.isArray(criterionResults)) {
    throw ValidationException.field('report.criterionResults', 'report.criterionResults must be an array')
  }
  if (evidence !== undefined && !Array.isArray(evidence)) {
    throw ValidationException.field('report.evidence', 'report.evidence must be an array')
  }
  if (contributorClaims !== undefined && !Array.isArray(contributorClaims)) {
    throw ValidationException.field('report.contributorClaims', 'report.contributorClaims must be an array')
  }

  return {
    id: requiredString(read(source, 'id'), 'report.id'),
    taskId: requiredString(read(source, 'taskId', 'task_id'), 'report.taskId'),
    taskAssignmentId,
    assignmentSnapshotId: requiredString(
      read(source, 'assignmentSnapshotId', 'assignment_snapshot_id'),
      'report.assignmentSnapshotId'
    ),
    assignmentSnapshotHash: sha256(
      read(source, 'assignmentSnapshotHash', 'assignment_snapshot_hash'),
      'report.assignmentSnapshotHash'
    ),
    taskContractVersionId: requiredString(
      read(source, 'taskContractVersionId', 'task_contract_version_id'),
      'report.taskContractVersionId'
    ),
    reportedBy: requiredString(read(source, 'reportedBy', 'reported_by'), 'report.reportedBy'),
    workPerformed: stringValue(read(source, 'workPerformed', 'work_performed') ?? '', 'report.workPerformed'),
    contributionStatement: stringValue(
      read(source, 'contributionStatement', 'contribution_statement') ?? '',
      'report.contributionStatement'
    ),
    actualRole: stringValue(read(source, 'actualRole', 'actual_role') ?? '', 'report.actualRole'),
    actualOwnership: nullableEnumValue(
      read(source, 'actualOwnership', 'actual_ownership'),
      TVA_OWNERSHIP_LEVELS,
      'report.actualOwnership'
    ),
    actualAutonomy: nullableEnumValue(
      read(source, 'actualAutonomy', 'actual_autonomy'),
      TVA_AUTONOMY_LEVELS,
      'report.actualAutonomy'
    ),
    actualDeliverableIds: stringArray(
      read(source, 'actualDeliverableIds', 'actual_deliverable_ids'),
      'report.actualDeliverableIds'
    ),
    actualOutcomes: jsonObject(read(source, 'actualOutcomes', 'actual_outcomes'), 'report.actualOutcomes'),
    impactObserved: jsonObject(read(source, 'impactObserved', 'impact_observed'), 'report.impactObserved'),
    limitations: optionalString(read(source, 'limitations'), 'report.limitations'),
    remainingWork: optionalString(read(source, 'remainingWork', 'remaining_work'), 'report.remainingWork'),
    criterionResults: (criterionResults as unknown[] | undefined)?.map(mapCriterionResult) ?? [],
    evidence: (evidence as unknown[] | undefined)?.map(mapEvidence) ?? [],
    contributorClaims: (contributorClaims as unknown[] | undefined)?.map(mapClaim) ?? [],
  }
}

function mapEvidenceManifest(value: unknown): CompletionEvidenceManifestInput[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw ValidationException.field('evidenceManifest', 'evidenceManifest must be an array')
  }
  return value.map((item, index) => {
    const source = asObject(item, `evidenceManifest.${index}`)
    const field = (name: string) => `evidenceManifest.${index}.${name}`
    return {
      evidenceId: requiredString(read(source, 'evidenceId', 'evidence_id'), field('evidenceId')),
      evidenceType: requiredString(read(source, 'evidenceType', 'evidence_type'), field('evidenceType')),
      title: requiredString(read(source, 'title'), field('title')),
      description: optionalString(read(source, 'description'), field('description')),
      uri: optionalString(read(source, 'uri'), field('uri')),
      storageReference: optionalString(
        read(source, 'storageReference', 'storage_reference'),
        field('storageReference')
      ),
      versionReference: optionalString(
        read(source, 'versionReference', 'version_reference'),
        field('versionReference')
      ),
      contentHash:
        read(source, 'contentHash', 'content_hash') === null ||
        read(source, 'contentHash', 'content_hash') === undefined
          ? null
          : sha256(read(source, 'contentHash', 'content_hash'), field('contentHash')),
      capturedAt: optionalString(read(source, 'capturedAt', 'captured_at'), field('capturedAt')),
    }
  })
}

export function buildTaskCompletionReportInput(
  ctx: HttpContext
): PersistTaskCompletionReportInput {
  const assignmentId = requiredString(ctx.params['assignmentId'], 'assignmentId')
  const body = ctx.request.only([
    'taskSubmissionId',
    'task_submission_id',
    'expectedRevision',
    'expected_revision',
    'idempotencyKey',
    'idempotency_key',
    'report',
    'evidenceManifest',
    'evidence_manifest',
  ])
  const expectedRevision = read(body, 'expectedRevision', 'expected_revision')

  if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw ValidationException.field('expectedRevision', 'expectedRevision must be a non-negative integer')
  }

  return {
    taskSubmissionId: requiredString(
      read(body, 'taskSubmissionId', 'task_submission_id'),
      'taskSubmissionId'
    ),
    expectedRevision,
    idempotencyKey: requiredString(
      read(body, 'idempotencyKey', 'idempotency_key'),
      'idempotencyKey'
    ),
    report: mapReport(read(body, 'report'), assignmentId),
    evidenceManifest: mapEvidenceManifest(read(body, 'evidenceManifest', 'evidence_manifest')),
  }
}
