import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  ReviewObservationAuthoringContext,
  ReviewObservationAuthoringContextInput,
  ReviewObservationAuthoringContextReader,
  ReviewObservationAuthoritativeEvidence,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_authoring_context_reader'
import {
  resolveReviewObservationReviewerAuthorization,
  type NativeReviewerAssignmentAuthorizationRow,
  type ReviewerAssignmentStatus,
} from '#modules/reviews/domain/observation/reviewer_assignment_authorization'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import { isTaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import { hashTaskAssignmentIdentity } from '#modules/tasks/public_contracts/task_assignment_identity'

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const result: Record<string, unknown> = {}
  const record = value as Record<string, unknown>
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(record[key])
  }
  return result
}

function hash(value: unknown): TvaSha256 {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')}`
}

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

interface WorkflowRow {
  reviewee_id: string
  task_id: string
  organization_id: string
}

interface SessionRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
}

interface ReviewerAssignmentRow {
  reviewer_id: string
  reviewer_type: 'human' | 'agent' | 'system'
  assignment_role: string
  status: string
}

interface LegacyReviewerRow {
  reviewer_id: string
  reviewer_role: string
  status: string
}

interface SnapshotRow {
  id: string
  canonical_snapshot: unknown
  snapshot_hash: string
}

interface ReportRow {
  id: string
  task_id: string
  task_contract_version_id: string
  assignment_snapshot_hash: string
  task_contract_hash: string
  completion_report_hash: string
}

interface ClaimRow {
  id: string
  schema_version: 'suar.completion_claim.v1'
  completion_report_id: string
  completion_report_revision: number
  completion_report_hash: TvaSha256
  assignment_snapshot_id: string
  task_contract_version_id: string
  contributor_user_id: string
  action: string | null
  object: string
  proposed_title: string | null
  proposed_statement: string | null
  actual_role: string
  actual_ownership: CompletionClaimV1['actualOwnership']
  actual_autonomy: CompletionClaimV1['actualAutonomy']
  contribution_statement: string
  deliverable_refs: string[]
  criterion_result_refs: string[]
  evidence_refs: string[]
  outcome_data: unknown
  public_claim_draft: unknown
  privacy_classification: CompletionClaimV1['privacyClassification']
  claim_status: CompletionClaimV1['status']
  claim_hash: TvaSha256
  created_at: string | Date
}

interface EvidenceRow {
  id: string
  access_classification: ReviewObservationAuthoritativeEvidence['accessClassification']
  reviewer_access_state: 'available' | 'restricted' | 'unavailable' | 'unknown'
  content_hash: TvaSha256
}

/** Read-only bridge from legacy Lucid tables to the native TVA review contract. */
export default class LucidReviewObservationAuthoringContextReader implements ReviewObservationAuthoringContextReader {
  async load(
    input: ReviewObservationAuthoringContextInput
  ): Promise<ReviewObservationAuthoringContext | null> {
    const pinnedWorkflow = (await db
      .from('task_review_workflows')
      .where({ id: input.reviewWorkflowId, task_assignment_id: input.taskAssignmentId })
      .first()) as WorkflowRow | null
    if (!pinnedWorkflow) return null

    const session = (await db
      .from('review_sessions')
      .where({
        id: input.reviewSessionId,
        task_assignment_id: input.taskAssignmentId,
        reviewee_id: input.subjectUserId,
      })
      .first()) as SessionRow | null
    const [nativeAssignments, legacyReviewer] = await Promise.all([
      db
        .from('review_session_reviewer_assignments')
        .where({ review_session_id: input.reviewSessionId })
        .select('reviewer_id', 'reviewer_type', 'assignment_role', 'status') as unknown as Promise<ReviewerAssignmentRow[]>,
      db
        .from('task_review_reviewers')
        .where({ workflow_id: input.reviewWorkflowId, reviewer_id: input.reviewerId })
        .whereIn('status', ['pending', 'submitted'])
        .first() as unknown as Promise<LegacyReviewerRow | null>,
    ])
    const reviewerAuthorization = resolveReviewObservationReviewerAuthorization({
      reviewerId: input.reviewerId,
      nativeAssignments: nativeAssignments.map((assignment) => ({
        reviewerId: assignment.reviewer_id,
        reviewerType: assignment.reviewer_type as NativeReviewerAssignmentAuthorizationRow['reviewerType'],
        assignmentRole:
          assignment.assignment_role as NativeReviewerAssignmentAuthorizationRow['assignmentRole'],
        status: assignment.status as ReviewerAssignmentStatus,
      })),
      legacyReviewer: legacyReviewer
        ? {
            reviewerId: legacyReviewer.reviewer_id,
            reviewerRole: legacyReviewer.reviewer_role,
            status: legacyReviewer.status,
          }
        : null,
    })
    if (
      !session ||
      !reviewerAuthorization ||
      pinnedWorkflow.reviewee_id !== input.subjectUserId ||
      input.reviewerType !== 'human'
    )
      return null

    const snapshotRow = (await db
      .from('task_assignment_snapshots')
      .where({ id: input.assignmentSnapshotId, task_assignment_id: input.taskAssignmentId })
      .first()) as SnapshotRow | null
    const envelope = asObject(snapshotRow?.canonical_snapshot)
    const rawSnapshot = asObject(envelope?.['snapshot'])
    if (
      !snapshotRow ||
      !envelope ||
      envelope['schemaVersion'] !== 'suar.task_assignment_contract_snapshot.v1' ||
      !rawSnapshot ||
      !isTaskAssignmentSnapshotV1(rawSnapshot) ||
      rawSnapshot.snapshotHash !== snapshotRow.snapshot_hash ||
      rawSnapshot['id'] !== input.assignmentSnapshotId ||
      rawSnapshot['assignmentId'] !== input.taskAssignmentId ||
      input.sourceSnapshotHash !== rawSnapshot['snapshotHash']
    )
      return null
    const snapshot = rawSnapshot as unknown as TaskAssignmentSnapshotV1
    if (
      pinnedWorkflow.task_id !== snapshot.taskId ||
      pinnedWorkflow.organization_id !== snapshot.organizationId
    )
      return null
    const { snapshotHash: declaredHash, ...snapshotWithoutHash } = snapshot
    if (
      hash({
        envelopeSchemaVersion: envelope['schemaVersion'],
        snapshot: snapshotWithoutHash,
        workFieldProvenance: envelope['workFieldProvenance'],
        acknowledgementBasis: envelope['acknowledgementBasis'],
        changeDecision: envelope['changeDecision'],
      }) !== declaredHash
    )
      return null

    const resolved = snapshot.resolvedContract
    const evidenceContract = resolved.evidence
    const policy = evidenceContract.verifierPolicy
    const reviewerRole = reviewerAuthorization.reviewerRole

    const capability =
      input.observationType === 'capability'
        ? evidenceContract.capabilities.find((entry) => entry.capabilityId === input.targetRef)
        : null
    if (input.observationType === 'capability' && !capability) return null

    const reviewerIds = policy.reviewerIds
    const reviewerRoles = policy.reviewerRoleCodes
    if (
      (reviewerIds.length > 0 && !reviewerIds.includes(input.reviewerId)) ||
      (reviewerRoles.length > 0 && !reviewerRoles.includes(reviewerRole))
    )
      return null

    const report = (await db
      .from('task_completion_reports')
      .where({
        id: input.completionReportId,
        task_assignment_id: input.taskAssignmentId,
        assignment_snapshot_id: input.assignmentSnapshotId,
        report_status: 'submitted',
      })
      .first()) as ReportRow | null
    if (
      !report ||
      report.task_id !== snapshot.taskId ||
      report.task_contract_version_id !== resolved.versionId ||
      report.assignment_snapshot_hash !== snapshot.snapshotHash ||
      report.task_contract_hash !== resolved.resolvedContentHash
    )
      return null

    let completionClaim: CompletionClaimV1 | null = null
    let completionClaimHash: TvaSha256 | null = null
    if (input.completionClaimId) {
      const claim = (await db
        .from('task_completion_contributor_claims')
        .where({
          id: input.completionClaimId,
          completion_report_id: report.id,
          contributor_user_id: input.subjectUserId,
          assignment_snapshot_id: snapshot.id,
          task_contract_version_id: resolved.versionId,
          completion_report_hash: report.completion_report_hash,
        })
        .first()) as ClaimRow | null
      if (
        !claim ||
        !['candidate', 'under_review', 'partially_verified', 'verified'].includes(
          claim.claim_status
        )
      )
        return null
      completionClaimHash = claim.claim_hash
      completionClaim = {
        schemaVersion: claim.schema_version,
        id: claim.id,
        completionReportId: claim.completion_report_id,
        completionReportRevision: claim.completion_report_revision,
        completionReportHash: claim.completion_report_hash,
        assignmentSnapshotId: claim.assignment_snapshot_id,
        taskContractVersionId: claim.task_contract_version_id,
        userId: claim.contributor_user_id,
        action: claim.action ?? '',
        object: claim.object,
        proposedTitle: claim.proposed_title ?? '',
        proposedStatement: claim.proposed_statement ?? '',
        actualRole: claim.actual_role,
        actualOwnership: claim.actual_ownership,
        actualAutonomy: claim.actual_autonomy,
        contributionStatement: claim.contribution_statement,
        deliverableRefs: claim.deliverable_refs,
        criterionResultRefs: claim.criterion_result_refs,
        evidenceRefs: claim.evidence_refs,
        outcomeData: (asObject(claim.outcome_data) ?? {}) as CompletionClaimV1['outcomeData'],
        publicClaimDraft: typeof claim.public_claim_draft === 'string' ? claim.public_claim_draft : null,
        privacyClassification: claim.privacy_classification,
        status: claim.claim_status,
        createdAt: new Date(claim.created_at).toISOString(),
      }
    }

    const evidenceIds = [...new Set(input.evidenceIds)]
    if (evidenceIds.length !== input.evidenceIds.length) return null
    const evidenceRows = (evidenceIds.length === 0
      ? []
      : await db
          .from('task_completion_evidence_manifest')
          .where('completion_report_id', report.id)
          .whereIn('id', evidenceIds)
          .select('*')) as unknown as EvidenceRow[]
    if (evidenceRows.length !== evidenceIds.length) return null
    return {
      reviewerEligible: true,
      reviewerConflict: input.reviewerId === input.subjectUserId,
      reviewerRole,
      authorizedAssessmentCeiling: capability?.assessmentCeiling ?? null,
      taskAssignmentHash: hashTaskAssignmentIdentity(snapshot, { hash }),
      assignmentSnapshotHash: snapshot.snapshotHash,
      completionReportId: report.id,
      completionReportHash: report.completion_report_hash as TvaSha256,
      completionClaim,
      completionClaimHash,
      sourceSnapshotId: snapshot.id,
      taskContractVersionId: resolved.versionId,
      taskContractHash: resolved.resolvedContentHash,
      evidence: evidenceRows.map((row) => ({
        evidenceId: row.id,
        accessClassification: row.access_classification,
        reviewerAccessState: row.reviewer_access_state,
        evidenceHash: row.content_hash,
      })),
    }
  }
}
