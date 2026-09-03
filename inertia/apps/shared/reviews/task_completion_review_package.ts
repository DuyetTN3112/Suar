import axios from 'axios'

type JsonRecord = Record<string, unknown>

export interface TaskCompletionReviewPackageProjection {
  readonly schemaVersion: 'suar.task_completion_review_package_editor.v1'
  readonly reportId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly reportRevision: number
  readonly completionReportHash: string
  readonly assignmentContract: {
    readonly snapshot: JsonRecord
  }
  readonly report: JsonRecord
  readonly criterionResults: readonly JsonRecord[]
  readonly evidenceManifest: readonly JsonRecord[]
  readonly contributorClaims: readonly JsonRecord[]
  readonly evidenceMappings: readonly JsonRecord[]
  readonly packageHash: string
}

export interface ReviewPackageIdentity {
  readonly reportId: string
  readonly taskId: string
  readonly taskAssignmentId: string
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function requiredString(source: JsonRecord, key: string): string | null {
  const value = source[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function optionalString(source: JsonRecord, key: string): string | null | undefined {
  const value = source[key]
  if (value === undefined || value === null) return value
  return typeof value === 'string' ? value : undefined
}

function stringArray(source: JsonRecord, key: string): string[] | null {
  const value = source[key]
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null
  return value as string[]
}

function pick(source: JsonRecord, keys: readonly string[]): JsonRecord {
  return Object.fromEntries(
    keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])
  )
}

function mapReport(value: unknown, reportId: string): JsonRecord | null {
  const source = record(value)
  if (!source || requiredString(source, 'id') !== reportId) return null
  return pick(source, [
    'id',
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
  ])
}

function mapAssignmentContract(
  value: unknown,
  identity: ReviewPackageIdentity
): { snapshot: JsonRecord } | null {
  const source = record(value)
  const snapshot = record(source?.['snapshot'])
  if (!snapshot) return null
  if (
    requiredString(snapshot, 'id') === null ||
    requiredString(snapshot, 'assignmentId') !== identity.taskAssignmentId ||
    requiredString(snapshot, 'taskId') !== identity.taskId ||
    requiredString(snapshot, 'snapshotHash') === null
  ) {
    return null
  }

  const resolvedContract = record(snapshot['resolvedContract'])
  if (!resolvedContract || requiredString(resolvedContract, 'versionId') === null) return null
  const work = record(resolvedContract['work'])
  const evidence = record(resolvedContract['evidence'])
  if (!work || !evidence) return null

  return {
    snapshot: {
      ...pick(snapshot, [
        'id',
        'assignmentId',
        'taskId',
        'snapshotHash',
        'roleInTask',
        'ownershipLevel',
        'autonomyLevel',
        'collaborationType',
      ]),
      resolvedContract: {
        ...pick(resolvedContract, ['taskId', 'versionId', 'title']),
        work: pick(work, [
          'action',
          'object',
          'problemStatement',
          'desiredOutcome',
          'scope',
          'outOfScope',
          'deliverables',
          'acceptanceCriteria',
          'qualityRequirements',
          'constraints',
          'roleInTask',
          'ownershipLevel',
          'autonomyLevel',
          'collaborationType',
          'environment',
          'impactScope',
        ]),
        evidence: pick(evidence, [
          'requirements',
          'verificationMethod',
          'capabilities',
          'profileEligibility',
          'privacyClassification',
        ]),
      },
    },
  }
}

function mapRows(
  value: unknown,
  mapper: (row: JsonRecord) => JsonRecord | null
): JsonRecord[] | null {
  if (!Array.isArray(value)) return null
  const rows = value.map((item) => {
    const row = record(item)
    return row ? mapper(row) : null
  })
  return rows.every((row): row is JsonRecord => row !== null) ? rows : null
}

function mapCriterion(value: JsonRecord): JsonRecord | null {
  const id = requiredString(value, 'id')
  const criterionId = requiredString(value, 'criterionId')
  if (!id || !criterionId) return null
  return {
    id,
    criterionId,
    expectedOutcome: optionalString(value, 'expectedOutcome') ?? null,
    actualOutcome: optionalString(value, 'actualOutcome') ?? null,
    result: optionalString(value, 'result') ?? null,
    explanation: optionalString(value, 'explanation') ?? null,
    deviationStatus: optionalString(value, 'deviationStatus') ?? null,
    deviationSummary: optionalString(value, 'deviationSummary') ?? null,
    notApplicableReason: optionalString(value, 'notApplicableReason') ?? null,
  }
}

function mapEvidence(value: JsonRecord): JsonRecord | null {
  const evidenceId = requiredString(value, 'evidenceId')
  if (!evidenceId) return null
  return {
    evidenceId,
    evidenceType: optionalString(value, 'evidenceType') ?? null,
    title: optionalString(value, 'title') ?? null,
    description: optionalString(value, 'description') ?? null,
    accessClassification: optionalString(value, 'accessClassification') ?? null,
    reviewerAccessState: optionalString(value, 'reviewerAccessState') ?? null,
    availability: optionalString(value, 'availability') ?? null,
    availabilityReason: optionalString(value, 'availabilityReason') ?? null,
  }
}

function mapClaim(value: JsonRecord): JsonRecord | null {
  const id = requiredString(value, 'id')
  const evidenceRefs = stringArray(value, 'evidenceRefs')
  const deliverableRefs = stringArray(value, 'deliverableRefs')
  const criterionResultRefs = stringArray(value, 'criterionResultRefs')
  if (!id || evidenceRefs === null || deliverableRefs === null || criterionResultRefs === null)
    return null
  return {
    id,
    contributorUserId: optionalString(value, 'contributorUserId') ?? null,
    action: optionalString(value, 'action') ?? null,
    object: optionalString(value, 'object') ?? null,
    proposedTitle: optionalString(value, 'proposedTitle') ?? null,
    proposedStatement: optionalString(value, 'proposedStatement') ?? null,
    actualRole: optionalString(value, 'actualRole') ?? null,
    actualOwnership: optionalString(value, 'actualOwnership') ?? null,
    actualAutonomy: optionalString(value, 'actualAutonomy') ?? null,
    contributionStatement: optionalString(value, 'contributionStatement') ?? null,
    deliverableRefs,
    criterionResultRefs,
    evidenceRefs,
    privacyClassification: optionalString(value, 'privacyClassification') ?? null,
    claimStatus: optionalString(value, 'claimStatus') ?? null,
  }
}

function mapEvidenceMapping(value: JsonRecord): JsonRecord | null {
  const id = requiredString(value, 'id')
  const evidenceItemId = requiredString(value, 'evidenceItemId')
  if (!id || !evidenceItemId) return null
  return {
    id,
    evidenceItemId,
    criterionResultId: optionalString(value, 'criterionResultId') ?? null,
    contributorClaimId: optionalString(value, 'contributorClaimId') ?? null,
    mappingPurpose: optionalString(value, 'mappingPurpose') ?? null,
    attributionStatement: optionalString(value, 'attributionStatement') ?? null,
  }
}

export function normalizeTaskCompletionReviewPackage(
  value: unknown,
  identity: ReviewPackageIdentity
): TaskCompletionReviewPackageProjection | null {
  const source = record(value)
  const reportRevision = source?.['reportRevision']
  const completionReportHash = source ? requiredString(source, 'completionReportHash') : null
  const packageHash = source ? requiredString(source, 'packageHash') : null
  if (
    !source ||
    source['schemaVersion'] !== 'suar.task_completion_review_package_editor.v1' ||
    requiredString(source, 'reportId') !== identity.reportId ||
    requiredString(source, 'taskId') !== identity.taskId ||
    requiredString(source, 'taskAssignmentId') !== identity.taskAssignmentId ||
    typeof reportRevision !== 'number' ||
    !Number.isSafeInteger(reportRevision) ||
    completionReportHash === null ||
    packageHash === null
  ) {
    return null
  }

  const report = mapReport(source['report'], identity.reportId)
  const assignmentContract = mapAssignmentContract(source['assignmentContract'], identity)
  const criterionResults = mapRows(source['criterionResults'], mapCriterion)
  const evidenceManifest = mapRows(source['evidenceManifest'], mapEvidence)
  const contributorClaims = mapRows(source['contributorClaims'], mapClaim)
  const evidenceMappings = mapRows(source['evidenceMappings'], mapEvidenceMapping)
  if (
    !report ||
    !assignmentContract ||
    !criterionResults ||
    !evidenceManifest ||
    !contributorClaims ||
    !evidenceMappings
  )
    return null

  return {
    schemaVersion: 'suar.task_completion_review_package_editor.v1',
    reportId: identity.reportId,
    taskId: identity.taskId,
    taskAssignmentId: identity.taskAssignmentId,
    reportRevision,
    completionReportHash,
    assignmentContract,
    report,
    criterionResults,
    evidenceManifest,
    contributorClaims,
    evidenceMappings,
    packageHash,
  }
}

export function projectReviewPackageToObservationContext(
  baseContext: JsonRecord,
  packageValue: TaskCompletionReviewPackageProjection
): JsonRecord & {
  claims: JsonRecord[]
  evidence: JsonRecord[]
  reviewPackage: TaskCompletionReviewPackageProjection
} {
  return {
    ...baseContext,
    report: packageValue.report,
    claims: packageValue.contributorClaims.map((claim) => ({
      ...claim,
      proposed_title: claim['proposedTitle'],
      proposed_statement: claim['proposedStatement'],
      actual_ownership: claim['actualOwnership'],
      actual_autonomy: claim['actualAutonomy'],
      deliverable_refs: claim['deliverableRefs'],
      criterion_result_refs: claim['criterionResultRefs'],
      evidence_refs: claim['evidenceRefs'],
      privacy_classification: claim['privacyClassification'],
      claim_status: claim['claimStatus'],
    })),
    evidence: packageValue.evidenceManifest.map((item) => ({
      ...item,
      id: item['evidenceId'],
      reviewer_access_state: item['reviewerAccessState'],
      access_classification: item['accessClassification'],
    })),
    reviewPackage: packageValue,
  }
}

export async function loadTaskCompletionReviewPackage(
  reportId: string,
  taskId: string,
  taskAssignmentId: string
): Promise<TaskCompletionReviewPackageProjection | null> {
  const response = await axios.get<{ data?: unknown }>(
    `/api/v1/task-completion-reports/${encodeURIComponent(reportId)}/review-package`
  )
  return normalizeTaskCompletionReviewPackage(response.data.data, {
    reportId,
    taskId,
    taskAssignmentId,
  })
}
