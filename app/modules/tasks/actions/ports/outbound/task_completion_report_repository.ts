import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TvaJsonObject, TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface TaskCompletionReportSubmissionParent {
  readonly id: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly submittedBy: string
  readonly status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
}

export interface PersistedTaskCompletionReport {
  readonly id: string
  readonly taskSubmissionId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskContractVersionId: string
  readonly reportedBy: string
  readonly revision: number
  readonly idempotencyKey: string
  readonly status: 'draft' | 'submitted'
  readonly completionReportHash: TvaSha256
  readonly canonicalPayload: TvaJsonObject
  readonly reportedAt: string | null
}

export interface TaskCompletionReportAccessIdentity {
  readonly id: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly reportedBy: string
  readonly status: 'draft' | 'submitted'
}

export interface TaskCompletionReportWrite {
  readonly report: Record<string, unknown>
  readonly criterionResults: readonly Record<string, unknown>[]
  readonly evidence: readonly Record<string, unknown>[]
  readonly contributorClaims: readonly Record<string, unknown>[]
  readonly evidenceMappings: readonly Record<string, unknown>[]
}

export interface TaskCompletionReportFactBundle {
  readonly report: PersistedTaskCompletionReport
  readonly criterionResults: readonly Record<string, unknown>[]
  readonly evidenceManifest: readonly Record<string, unknown>[]
  readonly contributorClaims: readonly Record<string, unknown>[]
  readonly evidenceMappings: readonly Record<string, unknown>[]
}

/**
 * Persistence boundary for append-only Completion Report revisions. A draft save is an immutable
 * new revision, never an UPDATE of an already recorded report or child fact.
 */
export interface TaskCompletionReportRepository {
  findAccessIdentityById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportAccessIdentity | null>

  lockSubmissionParent(
    taskSubmissionId: string,
    transaction: TaskTransaction
  ): Promise<TaskCompletionReportSubmissionParent | null>

  findLatestBySubmission(
    taskSubmissionId: string,
    transaction?: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null>

  findBySubmissionIdempotency(
    taskSubmissionId: string,
    idempotencyKey: string,
    transaction: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null>

  findById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null>

  findFactBundleById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportFactBundle | null>

  findLatestFactBundleByAssignment(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportFactBundle | null>

  insertRevision(
    write: TaskCompletionReportWrite,
    transaction: TaskTransaction
  ): Promise<PersistedTaskCompletionReport>
}
