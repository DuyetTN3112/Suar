import type {
  CompletionAutonomy,
  CompletionCriterionResult,
  CompletionDeviationStatus,
  CompletionEvidenceDraft,
  CompletionOwnership,
  CompletionPrivacy,
} from './task_completion_report_payload.js'

export interface NativeDeliverable {
  id: string
  title: string
  description?: string | null
}

export interface NativeCriterion {
  id: string
  statement: string
  critical?: boolean
}

export interface NativeEvidenceRequirement {
  id: string
  title: string
  description?: string | null
  criterionIds?: readonly string[]
  deliverableIds?: readonly string[]
  required?: boolean
  privacyClassification?: string | null
}

export interface NativeCompletionBrief {
  state?: 'legacy' | 'draft' | 'published' | 'restricted'
  audience?: string | null
  resolutionSource?: string | null
  restrictionCode?: string | null
  assignmentId?: string | null
  assignmentSnapshotId?: string | null
  assignmentSnapshotHash?: string | null
  contractVersionId?: string | null
  acknowledgementRequired?: boolean
  acknowledgementState?:
    | 'not_required'
    | 'pending'
    | 'acknowledged'
    | 'clarification_requested'
    | null
  resolvedContract?: {
    title?: string | null
    work?: {
      action?: string | null
      object?: string | null
      roleInTask?: string | null
      ownershipLevel?: string | null
      autonomyLevel?: string | null
      deliverables?: readonly NativeDeliverable[]
      acceptanceCriteria?: readonly NativeCriterion[]
    } | null
    evidence?: {
      requirements?: readonly NativeEvidenceRequirement[]
    } | null
  } | null
}

export type NativeCompletionReportTranslate = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

export interface NativeReportCriterion {
  id: string
  criterionId: string
  expectedOutcome: string
  actualOutcome: string
  result: CompletionCriterionResult
  explanation: string
  evidenceIds: readonly string[]
  deviationStatus?: CompletionDeviationStatus
  deviationSummary?: string | null
  deviationApprovalRef?: string | null
  notApplicableReason?: string | null
  notApplicablePolicyRef?: string | null
}

export interface NativeReportEvidence {
  id: string
  evidenceRequirementIds: readonly string[]
  criterionIds: readonly string[]
  deliverableIds: readonly string[]
  ownerUserId?: string | null
  contributorUserIds?: readonly string[]
  reviewerAccessState: CompletionEvidenceDraft['reviewerAccessState']
  availability: CompletionEvidenceDraft['availability']
  privacyClassification: CompletionPrivacy
}

export interface NativeReportClaim {
  id: string
  contributorUserId: string
  actualRole: string
  actualOwnership: CompletionOwnership
  contributionStatement: string
  deliverableIds: readonly string[]
  criterionResultIds: readonly string[]
  evidenceIds: readonly string[]
}

export interface NativeReportValue {
  id: string
  taskSubmissionId: string
  taskId: string
  taskAssignmentId: string
  assignmentSnapshotId: string
  assignmentSnapshotHash: string
  taskContractVersionId: string
  reportedBy: string
  revision: number
  status: 'draft' | 'submitted'
  report: {
    workPerformed: string
    contributionStatement: string
    actualRole: string
    actualOwnership: CompletionOwnership | null
    actualAutonomy: CompletionAutonomy | null
    actualOutcomes: Record<string, unknown>
    impactObserved: Record<string, unknown>
    limitations: string | null
    remainingWork: string | null
    actualDeliverableIds: readonly string[]
    criterionResults: readonly NativeReportCriterion[]
    evidence: readonly NativeReportEvidence[]
    contributorClaims: readonly NativeReportClaim[]
  }
  evidenceManifest: readonly {
    evidenceId: string
    evidenceType: string
    title: string
    description?: string | null
    uri?: string | null
    storageReference?: string | null
    versionReference?: string | null
    contentHash?: string | null
    capturedAt?: string | null
  }[]
}

export interface StartValue {
  taskSubmissionId: string
  taskId: string
  taskAssignmentId: string
  assigneeId: string
  assignmentSnapshotId: string
  assignmentSnapshotHash: string
  taskContractVersionId: string
  status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
  replayed: boolean
}

export interface Envelope<T> {
  data: T
}

export type NativeReportField =
  | 'actualOutcome'
  | 'explanation'
  | 'result'
  | 'deviationStatus'
  | 'deviationSummary'
  | 'deviationApprovalRef'
  | 'notApplicableReason'
  | 'notApplicablePolicyRef'

export interface NativeCompletionReportProps {
  taskId: string
  assigneeId?: string | null
  brief: NativeCompletionBrief
  translate?: NativeCompletionReportTranslate
}
