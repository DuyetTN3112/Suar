import type { TaskCompletionReviewPackageV1 } from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'

export interface TaskCompletionReviewPackageResponse {
  readonly schemaVersion: 'suar.task_completion_review_package_editor.v1'
  readonly report: Record<string, unknown>
  readonly assignmentContract: { snapshot: Record<string, unknown> }
  readonly reportId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly reportRevision: number
  readonly completionReportHash: string
  readonly criterionResults: readonly Record<string, unknown>[]
  readonly evidenceManifest: readonly Record<string, unknown>[]
  readonly contributorClaims: readonly Record<string, unknown>[]
  readonly evidenceMappings: readonly Record<string, unknown>[]
  readonly packageHash: string
}

type SafeRecord = Record<string, unknown>

function record(value: unknown): SafeRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as SafeRecord) : {}
}

function pick(source: SafeRecord, keys: readonly string[]): SafeRecord {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]))
}

function mapResolvedContract(value: unknown): SafeRecord {
  const source = record(value)
  const work = record(source['work'])
  const evidence = record(source['evidence'])
  return {
    ...pick(source, ['taskId', 'versionId', 'title']),
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
      'dependencies',
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
  }
}

function mapAssignmentContract(value: TaskCompletionReviewPackageV1['assignmentContract']) {
  const snapshot = record(value.snapshot)
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
      resolvedContract: mapResolvedContract(snapshot['resolvedContract']),
    },
  }
}

function mapReport(value: unknown): SafeRecord {
  return pick(record(value), [
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

function mapCriterionResult(value: SafeRecord): SafeRecord {
  return {
    id: value['id'],
    criterionId: value['criterion_id'],
    expectedOutcome: value['expected_outcome'],
    actualOutcome: value['actual_outcome'],
    result: value['result'],
    explanation: value['explanation'],
    deviationStatus: value['deviation_status'],
    deviationSummary: value['deviation_summary'],
    notApplicableReason: value['not_applicable_reason'],
    validationOutcomes: value['validation_outcomes'],
  }
}

function mapEvidence(value: SafeRecord): SafeRecord {
  return {
    evidenceId: value['id'],
    evidenceType: value['evidence_type'],
    title: value['title'],
    description: value['description'] ?? null,
    versionReference: value['version_reference'] ?? null,
    contentHash: value['content_hash'] ?? null,
    capturedAt: value['captured_at'] ?? null,
    evidenceRequirementIds: value['evidence_requirement_ids'] ?? [],
    deliverableIds:
      value['related_deliverable_ids'] ??
      (value['related_deliverable_id'] ? [value['related_deliverable_id']] : []),
    accessClassification: value['access_classification'],
    reviewerAccessState: value['reviewer_access_state'],
    availability: value['availability'],
    availabilityReason: value['availability_reason'],
  }
}

function mapContributorClaim(value: SafeRecord): SafeRecord {
  return {
    id: value['id'],
    contributorUserId: value['contributor_user_id'],
    action: value['action'],
    object: value['object'],
    proposedTitle: value['proposed_title'],
    proposedStatement: value['proposed_statement'],
    actualRole: value['actual_role'],
    actualOwnership: value['actual_ownership'],
    actualAutonomy: value['actual_autonomy'],
    contributionStatement: value['contribution_statement'],
    deliverableRefs: value['deliverable_refs'],
    criterionResultRefs: value['criterion_result_refs'],
    evidenceRefs: value['evidence_refs'],
    privacyClassification: value['privacy_classification'],
    claimStatus: value['claim_status'],
  }
}

function mapEvidenceMapping(value: SafeRecord): SafeRecord {
  return {
    id: value['id'],
    evidenceItemId: value['evidence_item_id'],
    criterionResultId: value['criterion_result_id'] ?? null,
    contributorClaimId: value['contributor_claim_id'] ?? null,
    mappingPurpose: value['mapping_purpose'],
    attributionStatement: value['attribution_statement'] ?? null,
  }
}

export function mapTaskCompletionReviewPackageResponse(
  packageValue: TaskCompletionReviewPackageV1
): TaskCompletionReviewPackageResponse {
  const canonicalReport = record(packageValue.reportCanonicalPayload['report'])
  return {
    schemaVersion: 'suar.task_completion_review_package_editor.v1',
    reportId: packageValue.reportId,
    taskId: packageValue.taskId,
    taskAssignmentId: packageValue.taskAssignmentId,
    reportRevision: packageValue.reportRevision,
    completionReportHash: packageValue.completionReportHash,
    assignmentContract: mapAssignmentContract(packageValue.assignmentContract),
    report: mapReport(canonicalReport),
    criterionResults: packageValue.criterionResults.map((value) =>
      mapCriterionResult(record(value))
    ),
    evidenceManifest: packageValue.evidenceManifest.map((value) => mapEvidence(record(value))),
    contributorClaims: packageValue.contributorClaims.map((value) =>
      mapContributorClaim(record(value))
    ),
    evidenceMappings: packageValue.evidenceMappings.map((value) =>
      mapEvidenceMapping(record(value))
    ),
    packageHash: packageValue.packageHash,
  }
}
