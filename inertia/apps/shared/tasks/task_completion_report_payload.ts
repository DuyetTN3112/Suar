export type CompletionOwnership = 'contributor' | 'shared_owner' | 'primary_owner' | 'lead'
export type CompletionAutonomy = 'guided' | 'supervised' | 'independent' | 'leads_others'
export type CompletionCriterionResult = 'met' | 'partially_met' | 'not_met' | 'not_applicable'
export type CompletionDeviationStatus = 'none' | 'reported' | 'approved' | 'governed_exception'
export type CompletionPrivacy =
  | 'private'
  | 'internal'
  | 'confidential'
  | 'redacted'
  | 'public_safe'
  | 'public'

export interface CompletionReportPayloadContext {
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly taskSubmissionId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: string
  readonly taskContractVersionId: string
  readonly reportedBy: string
  readonly action: string
  readonly object: string
  readonly deliverableIds: readonly string[]
  readonly criteria: readonly { id: string; statement: string }[]
}

export interface CompletionCriterionDraft {
  readonly id: string
  readonly actualOutcome: string
  readonly explanation: string
  readonly result?: CompletionCriterionResult
  readonly evidenceIds: readonly string[]
  readonly deviationStatus?: CompletionDeviationStatus
  readonly deviationSummary?: string | null
  readonly deviationApprovalRef?: string | null
  readonly notApplicableReason?: string | null
  readonly notApplicablePolicyRef?: string | null
}

export interface CompletionEvidenceDraft {
  readonly id: string
  readonly evidenceType: string
  readonly title: string
  readonly description?: string | null
  readonly uri?: string | null
  readonly storageReference?: string | null
  readonly versionReference?: string | null
  readonly contentHash?: string | null
  readonly capturedAt?: string | null
  readonly evidenceRequirementIds: readonly string[]
  readonly criterionIds: readonly string[]
  readonly deliverableIds: readonly string[]
  /** Preserve server-authoritative attribution when an existing report is edited. */
  readonly ownerUserId?: string | null
  readonly contributorUserIds?: readonly string[]
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
  readonly availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'
  readonly privacyClassification: CompletionPrivacy
}

export interface CompletionEvidenceRequirement {
  readonly id: string
  readonly criterionIds: readonly string[]
  readonly deliverableIds: readonly string[]
}

export interface CompletionContributorClaimDraft {
  readonly id: string
  readonly contributorUserId: string
  readonly actualRole: string
  readonly actualOwnership: CompletionOwnership
  readonly contributionStatement: string
  readonly deliverableIds: readonly string[]
  readonly criterionResultIds: readonly string[]
  readonly evidenceIds: readonly string[]
}

export interface TaskCompletionReportPayloadInput {
  readonly context: CompletionReportPayloadContext
  readonly reportId: string
  readonly expectedRevision: number
  readonly idempotencyKey: string
  readonly actualRole: string
  readonly actualOwnership: CompletionOwnership | null
  readonly actualAutonomy: CompletionAutonomy | null
  readonly actualDeliverableIds: readonly string[]
  readonly workPerformed: string
  readonly contributionStatement: string
  readonly actualOutcomes: string
  readonly impactObserved: string
  readonly limitations?: string | null
  readonly remainingWork?: string | null
  readonly criterionResults: Readonly<Record<string, CompletionCriterionDraft>>
  readonly evidence: readonly CompletionEvidenceDraft[]
  readonly evidenceRequirements: readonly CompletionEvidenceRequirement[]
  readonly contributorClaims: readonly CompletionContributorClaimDraft[]
}

export function mergeExistingContributorClaims(
  existing: readonly CompletionContributorClaimDraft[],
  current: CompletionContributorClaimDraft,
  reporterId: string
): CompletionContributorClaimDraft[] {
  const currentClaimIndex = existing.findIndex((claim) => claim.contributorUserId === reporterId)
  if (currentClaimIndex === -1) return [...existing, current]
  return existing.map((claim, index) => (index === currentClaimIndex ? current : claim))
}

function jsonSummary(value: string): Record<string, string> {
  const summary = value.trim()
  return summary ? { summary } : {}
}

function nullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized || null
}

function assertWithinPinnedAssignmentContract(input: TaskCompletionReportPayloadInput): void {
  const criterionIds = new Set(input.context.criteria.map((criterion) => criterion.id))
  const deliverableIds = new Set(input.context.deliverableIds)
  const requirementIds = new Set(input.evidenceRequirements.map((requirement) => requirement.id))

  for (const item of input.evidence) {
    if (
      item.evidenceRequirementIds.some((id) => !requirementIds.has(id)) ||
      item.criterionIds.some((id) => !criterionIds.has(id)) ||
      item.deliverableIds.some((id) => !deliverableIds.has(id))
    ) {
      throw new Error('Evidence mapping is outside the pinned assignment contract')
    }
  }
}

export function buildTaskCompletionReportPayload(input: TaskCompletionReportPayloadInput) {
  assertWithinPinnedAssignmentContract(input)
  const { context } = input
  const criterionResults = context.criteria.flatMap((criterion) => {
    const draft = input.criterionResults[criterion.id]
    if (!draft || !draft.result) return []

    return [
      {
        id: draft.id,
        criterionId: criterion.id,
        expectedOutcome: criterion.statement,
        actualOutcome: draft.actualOutcome.trim(),
        result: draft.result,
        explanation: draft.explanation.trim(),
        evidenceIds: [...draft.evidenceIds],
        deviationStatus: draft.deviationStatus ?? 'none',
        deviationSummary: nullableText(draft.deviationSummary),
        deviationApprovalRef: nullableText(draft.deviationApprovalRef),
        notApplicableReason: nullableText(draft.notApplicableReason),
        notApplicablePolicyRef: nullableText(draft.notApplicablePolicyRef),
      },
    ]
  })

  const evidence = input.evidence.map((item) => ({
    id: item.id,
    evidenceRequirementIds: [...item.evidenceRequirementIds],
    criterionIds: [...item.criterionIds],
    deliverableIds: [...item.deliverableIds],
    ownerUserId: item.ownerUserId?.trim() || context.reportedBy,
    contributorUserIds: [
      ...new Set(
        (item.contributorUserIds ?? [context.reportedBy])
          .map((userId) => userId.trim())
          .filter((userId) => userId.length > 0)
      ),
    ],
    reviewerAccessState: item.reviewerAccessState,
    availability: item.availability,
    privacyClassification: item.privacyClassification,
  }))

  const evidenceManifest = input.evidence.map((item) => ({
    evidenceId: item.id,
    evidenceType: item.evidenceType.trim(),
    title: item.title.trim(),
    description: nullableText(item.description),
    uri: nullableText(item.uri),
    storageReference: nullableText(item.storageReference),
    versionReference: nullableText(item.versionReference),
    contentHash: item.contentHash ?? null,
    capturedAt: nullableText(item.capturedAt),
  }))

  const contributorClaims = input.contributorClaims.map((claim) => ({
    id: claim.id,
    contributorUserId: claim.contributorUserId,
    action: context.action,
    object: context.object,
    actualRole: claim.actualRole.trim(),
    actualOwnership: claim.actualOwnership,
    contributionStatement: claim.contributionStatement.trim(),
    deliverableIds: [...claim.deliverableIds],
    criterionResultIds: [...claim.criterionResultIds],
    evidenceIds: [...claim.evidenceIds],
  }))

  return {
    taskSubmissionId: context.taskSubmissionId,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
    report: {
      id: input.reportId,
      taskId: context.taskId,
      taskAssignmentId: context.taskAssignmentId,
      assignmentSnapshotId: context.assignmentSnapshotId,
      assignmentSnapshotHash: context.assignmentSnapshotHash,
      taskContractVersionId: context.taskContractVersionId,
      reportedBy: context.reportedBy,
      workPerformed: input.workPerformed.trim(),
      contributionStatement: input.contributionStatement.trim(),
      actualRole: input.actualRole.trim(),
      actualOwnership: input.actualOwnership,
      actualAutonomy: input.actualAutonomy,
      actualDeliverableIds: [...input.actualDeliverableIds],
      actualOutcomes: jsonSummary(input.actualOutcomes),
      impactObserved: jsonSummary(input.impactObserved),
      limitations: nullableText(input.limitations),
      remainingWork: nullableText(input.remainingWork),
      criterionResults,
      evidence,
      contributorClaims,
    },
    evidenceManifest,
  }
}
