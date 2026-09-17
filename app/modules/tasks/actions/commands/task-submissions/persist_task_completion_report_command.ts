import {
  assertEvidenceManifestMatches,
  buildTaskCompletionReportWrite,
  CompletionReportSubmissionBlockedError,
  PROVENANCE_CODES,
  reportPayload,
  type PersistTaskCompletionReportInput,
} from './task_completion_report_write_builder.js'

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
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type {
  TaskCompletionReportCode,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import {
  TASK_COMPLETION_REPORT_CODES,
  validateTaskCompletionReport,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'

export {
  CompletionReportSubmissionBlockedError,
  type CompletionEvidenceManifestInput,
  type PersistTaskCompletionReportInput,
} from './task_completion_report_write_builder.js'

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
      const write = buildTaskCompletionReportWrite({
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
        hasher: this.dependencies.hasher,
        idGenerator: this.dependencies.idGenerator,
      })
      const persisted = await this.dependencies.repository.insertRevision(write, transaction)
      return toResult(persisted, false, validation.blockerCodes)
    })
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
