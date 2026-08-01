import AppException from '#modules/errors/public_contracts/application_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskCompletionReportIdGenerator } from '#modules/tasks/actions/ports/outbound/task_completion_report_id_generator'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportRepository,
  TaskCompletionReportWrite,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type {
  CompletionEvidenceInput,
  CompletionReportInput,
  TaskCompletionReportCode,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import {
  TASK_COMPLETION_REPORT_CODES,
  validateTaskCompletionReport,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface CompletionEvidenceManifestInput {
  readonly evidenceId: string
  readonly evidenceType: string
  readonly title: string
  readonly description: string | null
  readonly uri: string | null
  readonly storageReference: string | null
  readonly versionReference: string | null
  readonly contentHash: TvaSha256 | null
  readonly capturedAt: string | null
}

export interface PersistTaskCompletionReportInput {
  readonly taskSubmissionId: string
  readonly expectedRevision: number
  readonly idempotencyKey: string
  readonly report: CompletionReportInput
  readonly evidenceManifest: readonly CompletionEvidenceManifestInput[]
}

export interface TaskCompletionReportCommandDependencies {
  readonly repository: TaskCompletionReportRepository
  readonly assignmentContracts: TaskAssignmentContractRepository
  readonly transactions: TaskTransactionRunner
  readonly hasher: TaskContractContentHasher
  readonly idGenerator: TaskCompletionReportIdGenerator
}

export interface PersistTaskCompletionReportResult extends PersistedTaskCompletionReport {
  readonly replayed: boolean
  readonly blockerCodes: readonly TaskCompletionReportCode[]
}

/** Stable error surface for submit gates. The exact codes are safe for UI and audit consumers. */
export class CompletionReportSubmissionBlockedError extends ValidationException {
  readonly blockerCodes: readonly TaskCompletionReportCode[]

  constructor(blockerCodes: readonly TaskCompletionReportCode[]) {
    super('Completion Report cannot be submitted for review', {
      completion_report: blockerCodes.join(','),
    })
    this.blockerCodes = blockerCodes
  }
}

const PROVENANCE_CODES = new Set<TaskCompletionReportCode>([
  TASK_COMPLETION_REPORT_CODES.taskProvenanceMismatch,
  TASK_COMPLETION_REPORT_CODES.assignmentProvenanceMismatch,
  TASK_COMPLETION_REPORT_CODES.snapshotProvenanceMismatch,
  TASK_COMPLETION_REPORT_CODES.snapshotHashMismatch,
  TASK_COMPLETION_REPORT_CODES.contractProvenanceMismatch,
  TASK_COMPLETION_REPORT_CODES.reporterNotAssignee,
])

function json(value: unknown): string {
  return JSON.stringify(value)
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

function assertEvidenceManifestMatches(
  evidence: readonly CompletionEvidenceInput[],
  manifest: readonly CompletionEvidenceManifestInput[]
): void {
  const evidenceIds = evidence.map((item) => item.id).sort()
  const manifestIds = manifest.map((item) => item.evidenceId).sort()
  if (
    !unique(manifestIds) ||
    evidenceIds.length !== manifestIds.length ||
    evidenceIds.some((id, index) => id !== manifestIds[index])
  ) {
    throw new ValidationException(
      'Completion evidence manifest must have one metadata record for every evidence item'
    )
  }
  for (const item of manifest) {
    if (!item.evidenceType.trim() || !item.title.trim() || (!item.uri && !item.storageReference)) {
      throw new ValidationException(
        'Completion evidence manifest requires type, title, and a durable URI or storage reference'
      )
    }
  }
}

function reportPayload(
  input: PersistTaskCompletionReportInput,
  status: 'draft' | 'submitted',
  revision: number,
  validationCodes: readonly TaskCompletionReportCode[],
  requestHash: TvaSha256
) {
  return {
    schemaVersion: 'suar.task_completion_report.v1',
    status,
    revision,
    requestHash,
    validationCodes,
    report: input.report,
    evidenceManifest: input.evidenceManifest,
  }
}

function draftPlaceholder(value: string): string {
  return value.trim() || 'unreported'
}

function toResult(
  persisted: PersistedTaskCompletionReport,
  replayed: boolean,
  blockerCodes: readonly TaskCompletionReportCode[]
): PersistTaskCompletionReportResult {
  return { ...persisted, replayed, blockerCodes }
}

class PersistTaskCompletionReportCommand {
  constructor(
    private readonly intent: 'save_draft' | 'submit_for_review',
    private readonly execCtx: TaskActionContext,
    private readonly dependencies: TaskCompletionReportCommandDependencies
  ) {}

  async execute(
    input: PersistTaskCompletionReportInput
  ): Promise<PersistTaskCompletionReportResult> {
    if (!input.idempotencyKey.trim()) {
      throw new ValidationException('Completion Report idempotency key is required')
    }
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new ValidationException(
        'Completion Report expected revision must be a non-negative integer'
      )
    }
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    if (actorId !== input.report.reportedBy) {
      throw new ForbiddenException('Only the reported assignee can write this Completion Report')
    }

    return this.dependencies.transactions.run(async (transaction) => {
      const parent = await this.dependencies.repository.lockSubmissionParent(
        input.taskSubmissionId,
        transaction
      )
      if (!parent) throw new NotFoundException('Task submission not found')
      if (actorId !== parent.submittedBy) {
        throw new ForbiddenException(
          'Only the task submission owner can write this Completion Report'
        )
      }
      const requestHash = this.dependencies.hasher.hash({ intent: this.intent, input })
      const replay = await this.dependencies.repository.findBySubmissionIdempotency(
        input.taskSubmissionId,
        input.idempotencyKey,
        transaction
      )
      if (replay) {
        if (replay.canonicalPayload['requestHash'] !== requestHash) {
          throw new ConflictException(
            'Completion Report idempotency key was already used for another payload'
          )
        }
        const replayCodes = Array.isArray(replay.canonicalPayload['validationCodes'])
          ? (replay.canonicalPayload['validationCodes'] as TaskCompletionReportCode[])
          : []
        return toResult(replay, true, replayCodes)
      }
      if (parent.status !== 'draft' && parent.status !== 'needs_changes') {
        throw new ConflictException(
          'Task submission is no longer writable for Completion Report changes'
        )
      }

      const latest = await this.dependencies.repository.findLatestBySubmission(
        input.taskSubmissionId,
        transaction
      )
      const currentRevision = latest?.revision ?? 0
      if (latest?.status === 'submitted') {
        throw new ConflictException(
          'A submitted Completion Report is immutable; an explicit correction workflow is required'
        )
      }
      if (currentRevision !== input.expectedRevision) {
        throw new ConflictException('Completion Report revision is stale', {
          expectedRevision: input.expectedRevision,
          currentRevision,
        })
      }
      if (
        parent.taskId !== input.report.taskId ||
        parent.taskAssignmentId !== input.report.taskAssignmentId ||
        parent.submittedBy !== input.report.reportedBy
      ) {
        throw new CompletionReportSubmissionBlockedError([
          TASK_COMPLETION_REPORT_CODES.taskProvenanceMismatch,
          TASK_COMPLETION_REPORT_CODES.assignmentProvenanceMismatch,
          TASK_COMPLETION_REPORT_CODES.reporterNotAssignee,
        ])
      }

      const assignmentHistory = await this.dependencies.assignmentContracts.findHistory(
        input.report.taskAssignmentId,
        transaction
      )
      const snapshot = assignmentHistory.find(
        (candidate) =>
          candidate.id === input.report.assignmentSnapshotId &&
          candidate.snapshotHash === input.report.assignmentSnapshotHash
      )
      if (!snapshot) {
        throw new CompletionReportSubmissionBlockedError([
          TASK_COMPLETION_REPORT_CODES.snapshotProvenanceMismatch,
          TASK_COMPLETION_REPORT_CODES.snapshotHashMismatch,
        ])
      }
      if (
        this.intent === 'submit_for_review' &&
        snapshot.acknowledgementRequired &&
        snapshot.acknowledgementState !== 'acknowledged'
      ) {
        throw new CompletionReportSubmissionBlockedError([
          snapshot.acknowledgementState === 'clarification_requested'
            ? TASK_COMPLETION_REPORT_CODES.assignmentClarificationUnresolved
            : TASK_COMPLETION_REPORT_CODES.assignmentAcknowledgementRequired,
        ])
      }
      const validation = validateTaskCompletionReport({
        intent: this.intent,
        assignmentSnapshot: snapshot.envelope.snapshot,
        report: input.report,
      })
      const provenanceCodes = validation.blockerCodes.filter((code) => PROVENANCE_CODES.has(code))
      if (provenanceCodes.length > 0) {
        throw new CompletionReportSubmissionBlockedError(provenanceCodes)
      }
      if (this.intent === 'submit_for_review' && !validation.allowed) {
        throw new CompletionReportSubmissionBlockedError(validation.blockerCodes)
      }
      if (this.intent === 'submit_for_review') {
        assertEvidenceManifestMatches(input.report.evidence, input.evidenceManifest)
      }

      const revision = currentRevision + 1
      const status = this.intent === 'save_draft' ? 'draft' : 'submitted'
      const canonicalPayload = reportPayload(
        input,
        status,
        revision,
        validation.blockerCodes,
        requestHash
      )
      const completionReportHash = this.dependencies.hasher.hash(canonicalPayload)
      const write = this.buildWrite({
        input,
        parentId: parent.id,
        snapshotHash: snapshot.snapshotHash,
        taskContractHash: snapshot.envelope.snapshot.resolvedContract.resolvedContentHash,
        revision,
        supersedesReportId: latest?.id ?? null,
        status,
        canonicalPayload,
        completionReportHash,
        validationCodes: validation.blockerCodes,
      })
      const persisted = await this.dependencies.repository.insertRevision(write, transaction)
      return toResult(persisted, false, validation.blockerCodes)
    })
  }

  private buildWrite(input: {
    readonly input: PersistTaskCompletionReportInput
    readonly parentId: string
    readonly snapshotHash: TvaSha256
    readonly taskContractHash: TvaSha256
    readonly revision: number
    readonly supersedesReportId: string | null
    readonly status: 'draft' | 'submitted'
    readonly canonicalPayload: object
    readonly completionReportHash: TvaSha256
    readonly validationCodes: readonly TaskCompletionReportCode[]
  }): TaskCompletionReportWrite {
    const { report } = input.input
    const evidenceById = new Map(report.evidence.map((item) => [item.id, item]))
    const manifestByEvidenceId = new Map(
      input.input.evidenceManifest.map((item) => [item.evidenceId, item])
    )
    const reportRow: Record<string, unknown> = {
      id: report.id,
      contract_version: 1,
      schema_version: 'suar.task_completion_report.v1',
      task_submission_id: input.parentId,
      task_id: report.taskId,
      task_assignment_id: report.taskAssignmentId,
      assignment_snapshot_id: report.assignmentSnapshotId,
      task_contract_version_id: report.taskContractVersionId,
      revision: input.revision,
      idempotency_key: input.input.idempotencyKey,
      supersedes_report_id: input.revision === 1 ? null : input.supersedesReportId,
      correction_reason:
        input.revision === 1 ? null : 'Completion Report revision replaced prior draft',
      report_status: input.status,
      work_performed: report.workPerformed,
      contribution_statement: report.contributionStatement,
      actual_role: draftPlaceholder(report.actualRole),
      actual_ownership: report.actualOwnership ?? 'contributor',
      actual_autonomy: report.actualAutonomy,
      key_decisions: json([]),
      deliverables_manifest: json(report.actualDeliverableIds),
      deviations: json(
        report.criterionResults.filter((result) => result.deviationStatus !== 'none')
      ),
      actual_outcomes: json(report.actualOutcomes),
      impact_observed: json(report.impactObserved),
      limitations: report.limitations,
      remaining_work: report.remainingWork,
      collaborators: json(report.contributorClaims.map((claim) => claim.contributorUserId)),
      validation_outcomes: json(input.validationCodes),
      public_claim_draft: null,
      privacy_classification: report.evidence[0]?.privacyClassification ?? 'internal',
      assignment_snapshot_hash: input.snapshotHash,
      task_contract_hash: input.taskContractHash,
      completion_report_hash: input.completionReportHash,
      canonical_payload: json(input.canonicalPayload),
      created_by: report.reportedBy,
      reported_at: input.status === 'submitted' ? new Date() : null,
    }
    // Draft payload is intentionally stored only in the immutable report envelope. Child tables
    // model verified, structurally complete facts and their database constraints must not make an
    // author lose an incomplete draft (for example an in-progress criterion explanation).
    if (input.status === 'draft') {
      return {
        report: reportRow,
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
        evidenceMappings: [],
      }
    }
    const criterionResults = report.criterionResults.map((result) => ({
      id: result.id,
      schema_version: 'suar.task_completion_criterion_result.v1',
      completion_report_id: report.id,
      criterion_id: result.criterionId,
      expected_outcome: result.expectedOutcome,
      actual_outcome: result.actualOutcome,
      result: result.result,
      explanation: result.explanation,
      deviation_status: result.deviationStatus,
      deviation_summary: result.deviationSummary,
      deviation_approval_ref: result.deviationApprovalRef,
      not_applicable_reason: result.notApplicableReason,
      not_applicable_policy_ref: result.notApplicablePolicyRef,
      validation_outcomes: json(input.validationCodes),
      result_hash: this.dependencies.hasher.hash({
        completionReportHash: input.completionReportHash,
        result,
      }),
    }))
    const evidence = report.evidence.map((item) => {
      const manifest = manifestByEvidenceId.get(item.id)
      if (!manifest) throw new ValidationException(`Missing manifest for evidence ${item.id}`)
      return {
        id: item.id,
        schema_version: 'suar.task_completion_evidence_manifest_item.v1',
        completion_report_id: report.id,
        idempotency_key: item.id,
        evidence_type: manifest.evidenceType,
        title: manifest.title,
        description: manifest.description,
        uri: manifest.uri,
        storage_reference: manifest.storageReference,
        version_reference: manifest.versionReference,
        content_hash: manifest.contentHash,
        manifest_hash: this.dependencies.hasher.hash({ item, manifest }),
        captured_at: manifest.capturedAt,
        owner_user_id: item.ownerUserId,
        contributor_user_ids: json(item.contributorUserIds),
        evidence_requirement_ids: json(item.evidenceRequirementIds),
        related_deliverable_id: item.deliverableIds[0] ?? null,
        related_deliverable_ids: json(item.deliverableIds),
        access_classification: item.privacyClassification,
        reviewer_access_state: item.reviewerAccessState,
        availability: item.availability,
        availability_reason: item.availability === 'available' ? 'none' : 'unknown',
        retention_state: 'retained',
        availability_checked_at: new Date(),
        tombstoned_at: null,
      }
    })
    const contributorClaims = report.contributorClaims.map((claim) => ({
      id: claim.id,
      contract_version: 1,
      schema_version: 'suar.completion_claim.v1',
      completion_report_id: report.id,
      completion_report_revision: input.revision,
      completion_report_hash: input.completionReportHash,
      assignment_snapshot_id: report.assignmentSnapshotId,
      task_contract_version_id: report.taskContractVersionId,
      contributor_user_id: claim.contributorUserId,
      action: claim.action,
      object: claim.object,
      proposed_title: `${claim.action} ${claim.object}`.slice(0, 255),
      proposed_statement: claim.contributionStatement,
      actual_role: draftPlaceholder(claim.actualRole),
      actual_ownership: claim.actualOwnership ?? 'contributor',
      actual_autonomy: report.actualAutonomy,
      contribution_statement: claim.contributionStatement,
      deliverable_refs: json(claim.deliverableIds),
      criterion_result_refs: json(claim.criterionResultIds),
      evidence_refs: json(claim.evidenceIds),
      outcome_data: json(report.actualOutcomes),
      public_claim_draft: null,
      privacy_classification: report.evidence[0]?.privacyClassification ?? 'internal',
      claim_status: input.status === 'submitted' ? 'under_review' : 'candidate',
      claim_hash: this.dependencies.hasher.hash({
        completionReportHash: input.completionReportHash,
        claim,
      }),
      idempotency_key: claim.id,
      supersedes_claim_id: null,
      correction_reason: null,
    }))
    const evidenceMappings = [
      ...report.criterionResults.flatMap((result) =>
        result.evidenceIds.map((evidenceId) => ({
          id: this.dependencies.idGenerator.next(),
          schema_version: 'suar.task_completion_evidence_mapping.v1',
          completion_report_id: report.id,
          evidence_item_id: evidenceId,
          criterion_result_id: result.id,
          contributor_claim_id: null,
          mapping_purpose: 'completion_proof',
          attribution_statement: null,
          created_by: report.reportedBy,
        }))
      ),
      ...report.contributorClaims.flatMap((claim) =>
        claim.evidenceIds.map((evidenceId) => ({
          id: this.dependencies.idGenerator.next(),
          schema_version: 'suar.task_completion_evidence_mapping.v1',
          completion_report_id: report.id,
          evidence_item_id: evidenceId,
          criterion_result_id: null,
          contributor_claim_id: claim.id,
          mapping_purpose: 'attribution',
          attribution_statement: null,
          created_by: report.reportedBy,
        }))
      ),
    ]
    for (const evidenceId of evidenceById.keys()) {
      if (!manifestByEvidenceId.has(evidenceId))
        throw new ValidationException(`Missing manifest for evidence ${evidenceId}`)
    }
    return { report: reportRow, criterionResults, evidence, contributorClaims, evidenceMappings }
  }
}

export class SaveTaskCompletionReportDraftCommand {
  private readonly delegate: PersistTaskCompletionReportCommand

  constructor(execCtx: TaskActionContext, dependencies: TaskCompletionReportCommandDependencies) {
    this.delegate = new PersistTaskCompletionReportCommand('save_draft', execCtx, dependencies)
  }

  execute(input: PersistTaskCompletionReportInput): Promise<PersistTaskCompletionReportResult> {
    return this.delegate.execute(input)
  }

  async executeAndWrap(
    input: PersistTaskCompletionReportInput
  ): Promise<Result<PersistTaskCompletionReportResult, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}

export class SubmitTaskCompletionReportCommand {
  private readonly delegate: PersistTaskCompletionReportCommand

  constructor(execCtx: TaskActionContext, dependencies: TaskCompletionReportCommandDependencies) {
    this.delegate = new PersistTaskCompletionReportCommand(
      'submit_for_review',
      execCtx,
      dependencies
    )
  }

  execute(input: PersistTaskCompletionReportInput): Promise<PersistTaskCompletionReportResult> {
    return this.delegate.execute(input)
  }

  async executeAndWrap(
    input: PersistTaskCompletionReportInput
  ): Promise<Result<PersistTaskCompletionReportResult, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}

export class LoadTaskCompletionReportCommand {
  constructor(
    private readonly execCtx: TaskActionContext,
    private readonly repository: TaskCompletionReportRepository
  ) {}

  async execute(reportId: string): Promise<PersistedTaskCompletionReport> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    const report = await this.repository.findById(reportId)
    if (!report) throw new NotFoundException('Completion Report not found')
    if (report.reportedBy !== actorId) {
      throw new ForbiddenException('Only the reporting assignee can read this Completion Report')
    }
    return report
  }
}
