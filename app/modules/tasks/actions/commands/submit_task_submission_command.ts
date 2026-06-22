import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/constants/task_constants'
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
  status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
}

interface TaskRow {
  id: string
  title: string
  status: string
  task_status_id: string
  verification_method: string
  organization_id: string
  project_id: string
  assigned_to: string | null
  creator_id: string
  deleted_at: Date | null
  acceptance_criteria: string
  task_type: string
  difficulty: string | null
  expected_deliverables: unknown
}

interface AssignmentRow {
  id: string
  task_id: string
  assignee_id: string
  assignment_status: string
  assigned_by: string
}

interface SubmissionRow extends TaskSubmissionResult {
  implementation_notes: string | null
  known_limitations: string | null
  test_notes: string | null
  demo_url: string | null
  repository_url: string | null
  pull_request_url: string | null
}

function toJsonb(value: unknown): string {
  return JSON.stringify(value)
}

export default class SubmitTaskSubmissionCommand {
  constructor(
    private execCtx: TaskActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: SubmitTaskSubmissionDTO): Promise<TaskSubmissionResult> {
    const userId = this.requireUserId()
    const result = await this.persist(dto, userId)
    if (dto.submit) {
      await this.writeAuditAndNotify(result, dto)
    }
    return result
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
    const trx = await db.transaction()

    try {
      const task = await this.loadTask(dto.task_id, trx)
      const assignment = await this.loadActiveAssignment(task.id, trx)
      const existingSubmission = await this.loadSubmission(assignment.id, trx)

      this.enforcePreconditions(dto, userId, task, assignment, existingSubmission)

      const submission = await this.upsertSubmission(dto, userId, assignment, existingSubmission, trx)

      if (dto.submit) {
        await this.replaceEvidences(submission.id, dto.evidences, userId, trx)
        await this.createSubmittedSnapshot(task, assignment, trx)
        await this.moveTaskToReview(task, trx)
      }

      await trx.commit()

      return {
        id: submission.id,
        task_assignment_id: submission.task_assignment_id,
        task_id: submission.task_id,
        submitted_by: submission.submitted_by,
        summary: submission.summary,
        status: submission.status,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async loadTask(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskRow> {
    const task = (await trx
      .from('tasks')
      .where('id', taskId)
      .whereNull('deleted_at')
      .forUpdate()
      .first()) as TaskRow | undefined

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    return task
  }

  private async loadActiveAssignment(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<AssignmentRow> {
    const assignment = (await trx
      .from('task_assignments')
      .where('task_id', taskId)
      .where('assignment_status', 'active')
      .forUpdate()
      .first()) as AssignmentRow | undefined

    if (!assignment) {
      throw new BusinessLogicException('Task does not have an active assignment')
    }

    return assignment
  }

  private async loadSubmission(
    taskAssignmentId: string,
    trx: TransactionClientContract
  ): Promise<SubmissionRow | null> {
    const submission = (await trx
      .from('task_submissions')
      .where('task_assignment_id', taskAssignmentId)
      .forUpdate()
      .first()) as SubmissionRow | undefined

    return submission ?? null
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

    if (
      this.execCtx.organizationId &&
      this.execCtx.organizationId !== task.organization_id
    ) {
      throw new ForbiddenException('Task does not belong to the current organization context')
    }
  }

  private async upsertSubmission(
    dto: SubmitTaskSubmissionDTO,
    userId: string,
    assignment: AssignmentRow,
    existingSubmission: SubmissionRow | null,
    trx: TransactionClientContract
  ): Promise<SubmissionRow> {
    const status = dto.submit ? 'submitted' : 'draft'
    const submittedAt = dto.submit ? DateTime.now().toSQL() : null
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

    if (existingSubmission) {
      const [updated] = (await trx
        .from('task_submissions')
        .where('id', existingSubmission.id)
        .update(payload)
        .returning('*')) as Record<string, unknown>[]
      return updated as unknown as SubmissionRow
    }

    const [created] = (await trx.table('task_submissions').insert(payload).returning('*')) as Record<string, unknown>[]
    return created as unknown as SubmissionRow
  }

  private async replaceEvidences(
    submissionId: string,
    evidences: TaskSubmissionEvidenceInput[],
    uploadedBy: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await trx.from('task_submission_evidences').where('submission_id', submissionId).delete()

    if (evidences.length === 0) {
      return
    }

    await trx.table('task_submission_evidences').insert(
      evidences.map((evidence) => ({
        submission_id: submissionId,
        evidence_type: evidence.evidence_type,
        url: evidence.url,
        title: evidence.title ?? null,
        description: evidence.description ?? null,
        uploaded_by: uploadedBy,
      }))
    )
  }

  private async createSubmittedSnapshot(
    task: TaskRow,
    assignment: AssignmentRow,
    trx: TransactionClientContract
  ): Promise<void> {
    const existing = (await trx
      .from('task_assignment_snapshots')
      .where('task_assignment_id', assignment.id)
      .where('snapshot_reason', 'submitted')
      .first()) as Record<string, unknown> | null | undefined

    const policyResult = canCreateTaskAssignmentSnapshot({
      assignmentExists: true,
      taskDeleted: task.deleted_at !== null,
      taskMatchesAssignment: assignment.task_id === task.id,
      hasDuplicateReason: existing !== null && existing !== undefined,
      snapshotReason: 'submitted',
    })

    if (!policyResult.allowed) {
      throw new BusinessLogicException(policyResult.reason)
    }

    const requiredSkills = (await trx
      .from('task_required_skills')
      .where('task_id', task.id)
      .select('*')) as Record<string, unknown>[]

    await trx.table('task_assignment_snapshots').insert({
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
    })
  }

  private async moveTaskToReview(
    task: TaskRow,
    trx: TransactionClientContract
  ): Promise<void> {
    const inReviewStatusId = await this.ensureInReviewStatus(task.organization_id, trx)

    await trx
      .from('tasks')
      .where('id', task.id)
      .update({
        status: TaskStatus.IN_REVIEW,
        task_status_id: inReviewStatusId,
        updated_by: this.execCtx.userId,
      })
  }

  private async ensureInReviewStatus(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<string> {
    const existing = (await trx
      .from('task_statuses')
      .where('organization_id', organizationId)
      .where('slug', 'in_review')
      .first()) as { id: string } | undefined

    if (existing) {
      return existing.id
    }

    const [created] = (await trx
      .table('task_statuses')
      .insert({
        organization_id: organizationId,
        name: 'IN_REVIEW',
        slug: 'in_review',
        category: TaskStatusCategory.IN_PROGRESS,
        color: '#F59E0B',
        sort_order: 998,
        is_default: false,
        is_system: true,
      })
      .returning('id')) as [{ id: string }]

    return created.id
  }

  private async writeAuditAndNotify(
    submission: TaskSubmissionResult,
    dto: SubmitTaskSubmissionDTO
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: submission.submitted_by,
        action: 'submit',
        entity_type: 'task_submission',
        entity_id: submission.id,
        old_values: null,
        new_values: {
          task_id: dto.task_id,
          summary: submission.summary,
          evidence_count: dto.evidences.length,
        },
      },
      this.execCtx
    )

    await this.createNotification.handle({
      user_id: submission.submitted_by,
      title: 'Task submitted',
      message: 'Your task submission has been submitted for review.',
      type: BACKEND_NOTIFICATION_TYPES.TASK_SUBMITTED,
      related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
      related_entity_id: submission.task_id,
    })
  }
}
