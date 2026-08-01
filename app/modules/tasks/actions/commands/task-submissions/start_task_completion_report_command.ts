import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskCompletionRepository } from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const TASK_COMPLETION_REPORT_START_CODES = Object.freeze({
  assigneeDeactivated: 'TVA.COMPLETION.START.ASSIGNEE_DEACTIVATED',
  taskCancelled: 'TVA.COMPLETION.START.TASK_CANCELLED',
  assignmentNotActive: 'TVA.COMPLETION.START.ASSIGNMENT_NOT_ACTIVE',
} as const)

export type TaskCompletionReportStartCode =
  (typeof TASK_COMPLETION_REPORT_START_CODES)[keyof typeof TASK_COMPLETION_REPORT_START_CODES]

export interface StartTaskCompletionReportResult {
  readonly taskSubmissionId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assigneeId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskContractVersionId: string
  readonly status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
  readonly replayed: boolean
}

export interface StartTaskCompletionReportDependencies {
  readonly repository: TaskCompletionRepository
  readonly assignmentContracts: TaskAssignmentContractRepository
  readonly transactions: TaskTransactionRunner
}

export class CompletionReportStartBlockedError extends BusinessLogicException {
  readonly reasonCode: TaskCompletionReportStartCode

  constructor(reasonCode: TaskCompletionReportStartCode) {
    super('Completion Report cannot be started', { reasonCode })
    this.reasonCode = reasonCode
  }
}

export default class StartTaskCompletionReportCommand extends BaseCommand<
  string,
  StartTaskCompletionReportResult
> {
  constructor(
    execCtx: TaskActionContext,
    private readonly dependencies: StartTaskCompletionReportDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  async handle(assignmentId: string): Promise<StartTaskCompletionReportResult> {
    if (!assignmentId.trim()) throw new NotFoundException('Task assignment not found')
    const actorId = this.getCurrentUserId()

    return this.executeInTransaction(async (transaction) => {
      const interactionContext = await this.dependencies.assignmentContracts.lockInteractionContext(
        assignmentId,
        transaction
      )
      if (!interactionContext) throw new NotFoundException('Assignment Contract not found')
      if (actorId !== interactionContext.assigneeId) {
        throw new ForbiddenException('Only the assigned user can start this Completion Report')
      }
      if (!interactionContext.assigneeActive) {
        throw new CompletionReportStartBlockedError(
          TASK_COMPLETION_REPORT_START_CODES.assigneeDeactivated
        )
      }
      if (interactionContext.taskState === 'cancelled') {
        throw new CompletionReportStartBlockedError(
          TASK_COMPLETION_REPORT_START_CODES.taskCancelled
        )
      }
      if (interactionContext.assignmentState !== 'active') {
        throw new CompletionReportStartBlockedError(
          TASK_COMPLETION_REPORT_START_CODES.assignmentNotActive
        )
      }

      const snapshot = await this.dependencies.assignmentContracts.findCurrent(
        assignmentId,
        transaction
      )
      if (!snapshot) throw new NotFoundException('Assignment Contract snapshot not found')
      if (
        snapshot.id !== interactionContext.currentSnapshot.snapshotId ||
        snapshot.snapshotHash !== interactionContext.currentSnapshot.snapshotHash ||
        snapshot.sequence !== interactionContext.currentSnapshot.contractVersionHead
      ) {
        throw new InvariantViolationException(
          'Completion Report start crossed the locked Assignment Contract snapshot'
        )
      }

      const taskId = snapshot.envelope.snapshot.taskId
      const taskContractVersionId = snapshot.envelope.snapshot.resolvedContract.versionId
      const existing = await this.dependencies.repository.lockSubmissionByAssignment(
        assignmentId,
        transaction
      )
      if (existing) {
        this.assertParentIdentity(existing, assignmentId, taskId, interactionContext.assigneeId)
        return this.toResult(existing, snapshot, true)
      }

      const created = await this.dependencies.repository.upsertSubmission(
        null,
        {
          task_assignment_id: assignmentId,
          task_id: taskId,
          submitted_by: interactionContext.assigneeId,
          summary: '',
          implementation_notes: null,
          known_limitations: null,
          test_notes: null,
          demo_url: null,
          repository_url: null,
          pull_request_url: null,
          status: 'draft',
          submitted_at: null,
          locked_at: null,
        },
        new Date(),
        transaction
      )
      this.assertParentIdentity(created, assignmentId, taskId, interactionContext.assigneeId)
      return this.toResult(created, snapshot, false, taskContractVersionId)
    })
  }

  execute(assignmentId: string): Promise<StartTaskCompletionReportResult> {
    return this.handle(assignmentId)
  }

  private assertParentIdentity(
    parent: { id: string; task_assignment_id: string; task_id: string; submitted_by: string },
    assignmentId: string,
    taskId: string,
    assigneeId: string
  ): void {
    if (
      parent.task_assignment_id !== assignmentId ||
      parent.task_id !== taskId ||
      parent.submitted_by !== assigneeId
    ) {
      throw new InvariantViolationException(
        'Completion Report parent crossed the assignment or assignee boundary'
      )
    }
  }

  private toResult(
    parent: {
      id: string
      status: StartTaskCompletionReportResult['status']
    } & Record<string, unknown>,
    snapshot: Awaited<ReturnType<TaskAssignmentContractRepository['findCurrent']>> extends infer T
      ? Exclude<T, null>
      : never,
    replayed: boolean,
    taskContractVersionId = snapshot.envelope.snapshot.resolvedContract.versionId
  ): StartTaskCompletionReportResult {
    return {
      taskSubmissionId: parent.id,
      taskId: snapshot.envelope.snapshot.taskId,
      taskAssignmentId: snapshot.assignmentId,
      assigneeId: snapshot.envelope.snapshot.assigneeId,
      assignmentSnapshotId: snapshot.id,
      assignmentSnapshotHash: snapshot.snapshotHash,
      taskContractVersionId,
      status: parent.status,
      replayed,
    }
  }
}
