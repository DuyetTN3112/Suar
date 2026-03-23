import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  TaskSubmissionAssignment,
  TaskSubmissionRecord,
  TaskSubmissionTask,
} from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task_assignment_snapshot_rules'
import {
  canEditTaskSubmission,
  canSubmitTaskSubmission,
  validateTaskSubmissionPayload,
} from '#modules/tasks/domain/task_submission_rules'

export interface TaskSubmissionEvidenceInput {
  evidence_type:
    | 'pull_request'
    | 'commit_link'
    | 'demo_recording'
    | 'test_report'
    | 'document_link'
    | 'screenshot'
    | 'metrics_screenshot'
    | 'deployment_link'
    | 'other'
  url: string
  title?: string | null
  description?: string | null
}

export interface SubmitTaskSubmissionDTO {
  task_id: string
  summary: string
  implementation_notes?: string | null
  known_limitations?: string | null
  test_notes?: string | null
  demo_url?: string | null
  repository_url?: string | null
  pull_request_url?: string | null
  submit: boolean
  evidences: TaskSubmissionEvidenceInput[]
}

export interface TaskSubmissionResult {
  id: string
  task_assignment_id: string
  task_id: string
  submitted_by: string
  summary: string
  implementation_notes: string | null
  known_limitations: string | null
  test_notes: string | null
  demo_url: string | null
  repository_url: string | null
  pull_request_url: string | null
  status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
  locked_at?: string | null
}

type TaskRow = TaskSubmissionTask
type AssignmentRow = TaskSubmissionAssignment
type SubmissionRow = TaskSubmissionRecord

function toJsonb(value: unknown): string {
  return JSON.stringify(value)
}

export default class SubmitTaskSubmissionCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly reviewGovernance: TaskSubmissionReviewGovernance,
    private readonly dependencies: TaskExternalDependencies,
    private readonly notificationFanout: NotificationFanoutStagerContract
  ) {}

  async execute(dto: SubmitTaskSubmissionDTO): Promise<TaskSubmissionResult> {
    const userId = this.requireUserId()
    return this.persist(dto, userId)
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

      this.enforcePreconditions(dto, userId, task, assignment, existingSubmission)

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
        await this.replaceEvidences(submission.id, dto.evidences, userId, trx)
        await this.createSubmittedSnapshot(task, assignment, trx)
        reviewSessionId = await this.ensureReviewSession(task, assignment, trx)
        await this.stageSubmissionAuditAndFanout({
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

  private async loadTask(taskId: string, trx: TaskTransaction): Promise<TaskRow> {
    const task = await this.dependencies.completion.lockSubmissionTask(taskId, trx)

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    return task
  }

  private async loadActiveAssignment(
    taskId: string,
    trx: TaskTransaction
  ): Promise<AssignmentRow> {
    const assignment =
      await this.dependencies.completion.lockActiveAssignment(taskId, trx)

    if (!assignment) {
      throw new BusinessLogicException('Task does not have an active assignment')
    }

    return assignment
  }

  private async loadSubmission(
    taskAssignmentId: string,
    trx: TaskTransaction
  ): Promise<SubmissionRow | null> {
    return this.dependencies.completion.lockSubmissionByAssignment(
      taskAssignmentId,
      trx
    )
  }

  private enforcePreconditions(
    dto: SubmitTaskSubmissionDTO,
    userId: string,
    task: TaskRow,
    assignment: AssignmentRow,
    existingSubmission: SubmissionRow | null
  ): void {
    const policyResult = dto.submit
      ? canSubmitTaskSubmission({
          actorId: userId,
          assigneeId: assignment.assignee_id,
          assignmentStatus: assignment.assignment_status,
          taskStatus: task.status,
          submissionStatus: existingSubmission?.status ?? null,
        })
      : canEditTaskSubmission({
          actorId: userId,
          assigneeId: assignment.assignee_id,
          assignmentStatus: assignment.assignment_status,
          submissionStatus: existingSubmission?.status ?? null,
        })

    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') {
        throw new ForbiddenException(policyResult.reason)
      }
      throw new BusinessLogicException(policyResult.reason)
    }

    const payloadResult = validateTaskSubmissionPayload({
      summary: dto.summary,
      verificationMethod: task.verification_method,
      evidenceCount: dto.evidences.length,
      evidenceUrls: dto.evidences.map((evidence) => evidence.url),
    })

    if (!payloadResult.allowed) {
      throw new BusinessLogicException(payloadResult.reason)
    }

    if (this.execCtx.organizationId && this.execCtx.organizationId !== task.organization_id) {
      throw new ForbiddenException('Task does not belong to the current organization context')
    }
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

  private async createSubmittedSnapshot(
    task: TaskRow,
    assignment: AssignmentRow,
    trx: TaskTransaction
  ): Promise<void> {
    const existing = await this.dependencies.completion.assignmentSnapshotExists(
      assignment.id,
      'submitted',
      trx
    )

    const policyResult = canCreateTaskAssignmentSnapshot({
      assignmentExists: true,
      taskDeleted: task.deleted_at !== null,
      taskMatchesAssignment: assignment.task_id === task.id,
      hasDuplicateReason: existing,
      snapshotReason: 'submitted',
    })

    if (!policyResult.allowed) {
      throw new BusinessLogicException(policyResult.reason)
    }

    const requiredSkills =
      await this.dependencies.completion.listRequiredSkillSnapshots(task.id, trx)

    await this.dependencies.completion.createAssignmentSnapshot({
      task_assignment_id: assignment.id,
      task_id: task.id,
      snapshot_reason: 'submitted',
      task_snapshot: toJsonb({
        id: task.id,
        title: task.title,
        status: task.status,
        task_status_id: task.task_status_id,
        verification_method: task.verification_method,
        acceptance_criteria: task.acceptance_criteria,
        task_type: task.task_type,
        difficulty: task.difficulty,
        expected_deliverables: task.expected_deliverables,
        organization_id: task.organization_id,
        project_id: task.project_id,
      }),
      required_skills_snapshot: toJsonb(requiredSkills),
      acceptance_criteria_snapshot: toJsonb({
        acceptance_criteria: task.acceptance_criteria,
        verification_method: task.verification_method,
      }),
      workflow_snapshot: toJsonb({
        status: task.status,
        task_status_id: task.task_status_id,
      }),
    }, trx)
  }

  private async stageSubmissionAuditAndFanout(input: {
    submission: SubmissionRow
    task: TaskRow
    reviewSessionId: string | null
    evidenceCount: number
    trx: TaskTransaction
    now: Date
  }): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: input.submission.submitted_by,
        action: 'submit',
        entity_type: 'task_submission',
        entity_id: input.submission.id,
        old_values: null,
        new_values: {
          task_id: input.task.id,
          summary: input.submission.summary,
          evidence_count: input.evidenceCount,
        },
      },
      this.execCtx,
      { trx: input.trx, critical: true }
    )

    const templateContext = {
      schemaVersion: 1 as const,
      scope: { kind: 'organization' as const, id: input.task.organization_id },
      actor: { type: 'user', id: input.submission.submitted_by },
      subject: { type: 'task', id: input.task.id },
      occurredAt: input.now.toISOString(),
      ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
    }
    await this.notificationFanout.stage(
      {
        ...templateContext,
        eventName: 'task.submission_submitted',
        businessEventId: input.submission.id,
        type: 'task_submitted',
        parameters: {
          taskTitle: input.task.title,
          submissionId: input.submission.id,
        },
      },
      [input.submission.submitted_by],
      { trx: input.trx, now: input.now }
    )

    if (!input.reviewSessionId) {
      return
    }

    const audience = await this.reviewGovernance.loadNotificationAudience(
      input.reviewSessionId,
      input.submission.submitted_by,
      input.trx
    )

    if (!audience) {
      return
    }

    const reviewerIds = Array.from(
      new Set(
        audience.reviewerIds.filter(
          (reviewerId) => reviewerId !== audience.sessionRevieweeId
        )
      )
    )

    if (reviewerIds.length > 0) {
      await this.notificationFanout.stage(
        {
          ...templateContext,
          eventName: 'review.session_requested',
          businessEventId: input.reviewSessionId,
          type: 'review_requested',
          parameters: {
            taskTitle: input.task.title,
            reviewSessionId: input.reviewSessionId,
          },
        },
        reviewerIds,
        { trx: input.trx, now: input.now }
      )
    }
  }
}
