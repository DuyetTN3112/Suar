import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportFactBundle,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'

const EDITOR_SCHEMA = 'suar.task_completion_report_editor.v1' as const

export interface TaskCompletionReportEditorResponseV1 {
  readonly schemaVersion: typeof EDITOR_SCHEMA
  readonly id: string
  readonly taskSubmissionId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: string
  readonly taskContractVersionId: string
  readonly reportedBy: string
  readonly revision: number
  readonly status: 'draft' | 'submitted'
  readonly completionReportHash: string
  readonly reportedAt: string | null
  readonly blockerCodes: readonly string[]
  readonly report: {
    readonly [key: string]: unknown
    readonly criterionResults: readonly TvaJsonObject[]
    readonly evidence: readonly TvaJsonObject[]
    readonly contributorClaims: readonly TvaJsonObject[]
  }
  readonly evidenceManifest: readonly TvaJsonObject[]
}

export type TaskCompletionReportEditorSource =
  | TaskCompletionReportFactBundle
  | PersistedTaskCompletionReport

function object(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PersistedDataIntegrityException(`Completion Report ${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new PersistedDataIntegrityException(`Completion Report ${field} must be an array`)
  }
  return value
}

function allowlist(value: unknown, keys: readonly string[], field: string): TvaJsonObject {
  const source = object(value, field)
  return Object.fromEntries(
    keys.flatMap((key) => (key in source ? [[key, source[key]]] : []))
  ) as TvaJsonObject
}

function allowlistedArray(
  value: unknown,
  keys: readonly string[],
  field: string
): readonly TvaJsonObject[] {
  return array(value, field).map((entry, index) =>
    allowlist(entry, keys, `${field}.${index}`)
  )
}

const REPORT_KEYS = [
  'id',
  'taskId',
  'taskAssignmentId',
  'assignmentSnapshotId',
  'assignmentSnapshotHash',
  'taskContractVersionId',
  'reportedBy',
  'workPerformed',
  'contributionStatement',
  'actualRole',
  'actualOwnership',
  'actualAutonomy',
  'actualDeliverableIds',
  'actualOutcomes',
  'impactObserved',
  'limitations',
  'remainingWork',
  'criterionResults',
  'evidence',
  'contributorClaims',
] as const

const CRITERION_RESULT_KEYS = [
  'id',
  'criterionId',
  'expectedOutcome',
  'actualOutcome',
  'result',
  'explanation',
  'evidenceIds',
  'deviationStatus',
  'deviationSummary',
  'deviationApprovalRef',
  'notApplicableReason',
  'notApplicablePolicyRef',
] as const

const EVIDENCE_KEYS = [
  'id',
  'evidenceRequirementIds',
  'criterionIds',
  'deliverableIds',
  'ownerUserId',
  'contributorUserIds',
  'reviewerAccessState',
  'availability',
  'privacyClassification',
] as const

const CLAIM_KEYS = [
  'id',
  'contributorUserId',
  'action',
  'object',
  'actualRole',
  'actualOwnership',
  'contributionStatement',
  'deliverableIds',
  'criterionResultIds',
  'evidenceIds',
] as const

const MANIFEST_KEYS = [
  'evidenceId',
  'evidenceType',
  'title',
  'description',
  'uri',
  'storageReference',
  'versionReference',
  'contentHash',
  'capturedAt',
] as const

export function mapTaskCompletionReportEditorResponse(
  source: TaskCompletionReportEditorSource
): TaskCompletionReportEditorResponseV1 {
  const persistedReport = 'criterionResults' in source ? source.report : source
  const canonical = object(persistedReport.canonicalPayload, 'canonical payload')
  const canonicalReport = object(canonical['report'], 'canonical payload report')
  const editorReport = {
    ...allowlist(canonicalReport, REPORT_KEYS, 'canonical payload report'),
    criterionResults: allowlistedArray(
      canonicalReport['criterionResults'],
      CRITERION_RESULT_KEYS,
      'canonical payload report.criterionResults'
    ),
    evidence: allowlistedArray(
      canonicalReport['evidence'],
      EVIDENCE_KEYS,
      'canonical payload report.evidence'
    ),
    contributorClaims: allowlistedArray(
      canonicalReport['contributorClaims'],
      CLAIM_KEYS,
      'canonical payload report.contributorClaims'
    ),
  }

  const validationCodes = canonical['validationCodes']
  if (!Array.isArray(validationCodes) || validationCodes.some((code) => typeof code !== 'string')) {
    throw new PersistedDataIntegrityException(
      'Completion Report canonical payload validationCodes must be an array of strings'
    )
  }

  return {
    schemaVersion: EDITOR_SCHEMA,
    id: persistedReport.id,
    taskSubmissionId: persistedReport.taskSubmissionId,
    taskId: persistedReport.taskId,
    taskAssignmentId: persistedReport.taskAssignmentId,
    assignmentSnapshotId: persistedReport.assignmentSnapshotId,
    assignmentSnapshotHash: persistedReport.assignmentSnapshotHash,
    taskContractVersionId: persistedReport.taskContractVersionId,
    reportedBy: persistedReport.reportedBy,
    revision: persistedReport.revision,
    status: persistedReport.status,
    completionReportHash: persistedReport.completionReportHash,
    reportedAt: persistedReport.reportedAt,
    blockerCodes: validationCodes,
    report: editorReport,
    evidenceManifest: allowlistedArray(
      canonical['evidenceManifest'],
      MANIFEST_KEYS,
      'canonical payload evidenceManifest'
    ),
  }
}
