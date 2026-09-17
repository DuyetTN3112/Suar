import {
  createSubmittedSnapshot,
  enforceSubmissionPreconditions,
  stageSubmissionAuditAndFanout,
  type AssignmentRow,
  type SubmissionRow,
  type SubmitTaskSubmissionDTO,
  type TaskRow,
  type TaskSubmissionEvidenceInput,
  type TaskSubmissionResult,
} from './task_submission_execution_delegates.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { type NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { isTaskSubmissionEvidenceType } from '#modules/tasks/domain/task-submissions/task_submission_rules'

export type { SubmitTaskSubmissionDTO, TaskSubmissionEvidenceInput, TaskSubmissionResult }

export default class SubmitTaskSubmissionCommand extends BaseCommand<
  SubmitTaskSubmissionDTO,
  TaskSubmissionResult
> {
  constructor(
    execCtx: TaskActionContext,
    private readonly reviewGovernance: TaskSubmissionReviewGovernance,
    private readonly dependencies: TaskExternalDependencies,
    private readonly notificationFanout: NotificationFanoutStagerContract
  ) {
    super(execCtx, dependencies.transactions)
  }

  async handle(dto: SubmitTaskSubmissionDTO): Promise<TaskSubmissionResult> {
    for (const [index, evidence] of dto.evidences.entries()) {
      if (!isTaskSubmissionEvidenceType(evidence.evidence_type)) {
        throw ValidationException.field(
          `evidences.${index}.evidence_type`,
          'Unsupported task submission evidence type'
        )
      }
    }

    const userId = this.requireUserId()
    return this.persist(dto, userId)
  }

  execute(dto: SubmitTaskSubmissionDTO): Promise<TaskSubmissionResult> {
    return this.handle(dto)
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }
    return this.execCtx.userId
  }

  private async persist(
    dto: SubmitTaskSubmissionDTO,
    userId: string
  ): Promise<TaskSubmissionResult> {
    return this.dependencies.transactions.run(async (trx) => {
      const now = new Date()
      const task = await this.loadTask(dto.task_id, trx)
      const assignment = await this.loadActiveAssignment(task.id, trx)
      const existingSubmission = await this.loadSubmission(assignment.id, trx)

      enforceSubmissionPreconditions({
        dto,
        userId,
        task,
        assignment,
        existingSubmission,
        currentOrganizationId: this.execCtx.organizationId,
      })

      const submission = await this.upsertSubmission(
        dto,
        userId,
        assignment,
        existingSubmission,
        trx,
        now
      )
      let reviewSessionId: string | null = null

      if (dto.submit) {
        await this.requireSubmittedCompletionReport(assignment.id, submission.id, trx)
        await this.replaceEvidences(submission.id, dto.evidences, userId, trx)
        await createSubmittedSnapshot({
          dependencies: this.dependencies,
          task,
          assignment,
          trx,
        })
        reviewSessionId = await this.ensureReviewSession(task, assignment, trx)
        await stageSubmissionAuditAndFanout({
          execCtx: this.execCtx,
          notificationFanout: this.notificationFanout,
          reviewGovernance: this.reviewGovernance,
          submission,
          task,
          reviewSessionId,
          evidenceCount: dto.evidences.length,
          trx,
          now,
        })
      }

      return {
        id: submission.id,
        task_assignment_id: submission.task_assignment_id,
        task_id: submission.task_id,
        submitted_by: submission.submitted_by,
        summary: submission.summary,
        implementation_notes: submission.implementation_notes,
        known_limitations: submission.known_limitations,
        test_notes: submission.test_notes,
        demo_url: submission.demo_url,
        repository_url: submission.repository_url,
        pull_request_url: submission.pull_request_url,
        status: submission.status,
        locked_at: submission.locked_at ?? null,
      }
    })
  }

  private async ensureReviewSession(
    task: TaskRow,
    assignment: AssignmentRow,
    trx: TaskTransaction
  ): Promise<string> {
    return this.reviewGovernance.ensureSession(
      {
        taskAssignmentId: assignment.id,
        revieweeId: assignment.assignee_id,
        taskCreatorId: task.creator_id,
      },
      trx
    )
  }

  /**
   * A native TVA assignment has a locked Work/Evidence Contract. Its legacy submission row is
   * only the compatibility transport parent; it must never substitute actual completion facts.
   */
  private async requireSubmittedCompletionReport(
    assignmentId: string,
    submissionId: string,
    trx: TaskTransaction
  ): Promise<void> {
    const assignmentContract = this.dependencies.assignmentContract
    if (!assignmentContract) return

    const snapshot = await assignmentContract.repository.findCurrent(assignmentId, trx)
    if (!snapshot) return

    const completionReports = this.dependencies.completionReports
    if (!completionReports) {
      throw new BusinessLogicException('TVA.COMPLETION.REPORT_REPOSITORY_UNAVAILABLE')
    }
    const report = await completionReports.findLatestBySubmission(submissionId, trx)
    if (!report || report.status !== 'submitted') {
      throw new BusinessLogicException('TVA.COMPLETION.SUBMITTED_REPORT_REQUIRED')
    }
  }

  private async loadTask(taskId: string, trx: TaskTransaction): Promise<TaskRow> {
    const task = await this.dependencies.completion.lockSubmissionTask(taskId, trx)

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    return task
  }

  private async loadActiveAssignment(taskId: string, trx: TaskTransaction): Promise<AssignmentRow> {
    const assignment = await this.dependencies.completion.lockActiveAssignment(taskId, trx)

    if (!assignment) {
      throw new BusinessLogicException('Task does not have an active assignment')
    }

    return assignment
  }

  private async loadSubmission(
    taskAssignmentId: string,
    trx: TaskTransaction
  ): Promise<SubmissionRow | null> {
    return this.dependencies.completion.lockSubmissionByAssignment(taskAssignmentId, trx)
  }

  private async upsertSubmission(
    dto: SubmitTaskSubmissionDTO,
    userId: string,
    assignment: AssignmentRow,
    existingSubmission: SubmissionRow | null,
    trx: TaskTransaction,
    now: Date
  ): Promise<SubmissionRow> {
    const status = dto.submit ? 'submitted' : 'draft'
    const submittedAt = dto.submit ? now : null
    const payload = {
      task_assignment_id: assignment.id,
      task_id: assignment.task_id,
      submitted_by: userId,
      summary: dto.summary.trim(),
      implementation_notes: dto.implementation_notes ?? null,
      known_limitations: dto.known_limitations ?? null,
      test_notes: dto.test_notes ?? null,
      demo_url: dto.demo_url ?? null,
      repository_url: dto.repository_url ?? null,
      pull_request_url: dto.pull_request_url ?? null,
      status,
      submitted_at: submittedAt,
    }

    return this.dependencies.completion.upsertSubmission(
      existingSubmission?.id ?? null,
      payload,
      now,
      trx
    )
  }

  private async replaceEvidences(
    submissionId: string,
    evidences: TaskSubmissionEvidenceInput[],
    uploadedBy: string,
    trx: TaskTransaction
  ): Promise<void> {
    await this.dependencies.completion.replaceSubmissionEvidences(
      submissionId,
      evidences.map((evidence) => ({
        submission_id: submissionId,
        evidence_type: evidence.evidence_type,
        url: evidence.url,
        title: evidence.title ?? null,
        description: evidence.description ?? null,
        uploaded_by: uploadedBy,
      })),
      trx
    )
  }
}
