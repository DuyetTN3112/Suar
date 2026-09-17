import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type {
  TaskSubmissionAssignment,
  TaskSubmissionRecord,
  TaskSubmissionTask,
} from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSubmissionReviewGovernance } from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task-assignment/task_assignment_snapshot_rules'
import {
  canSaveTaskSubmissionDraft,
  canSubmitTaskSubmission,
  type TaskSubmissionEvidenceType,
  validateTaskSubmissionPayload,
} from '#modules/tasks/domain/task-submissions/task_submission_rules'

export interface TaskSubmissionEvidenceInput {
  evidence_type: TaskSubmissionEvidenceType
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

export type TaskRow = TaskSubmissionTask
export type AssignmentRow = TaskSubmissionAssignment
export type SubmissionRow = TaskSubmissionRecord

function toJsonb(value: unknown): string {
  return JSON.stringify(value)
}

export function enforceSubmissionPreconditions(params: {
  dto: SubmitTaskSubmissionDTO
  userId: string
  task: TaskRow
  assignment: AssignmentRow
  existingSubmission: SubmissionRow | null
  currentOrganizationId?: string | null
}): void {
  const { dto, userId, task, assignment, existingSubmission, currentOrganizationId } = params

  const policyResult = dto.submit
    ? canSubmitTaskSubmission({
        actorId: userId,
        assigneeId: assignment.assignee_id,
        assignmentStatus: assignment.assignment_status,
        taskStatus: task.status,
        submissionStatus: existingSubmission?.status ?? null,
      })
    : canSaveTaskSubmissionDraft({
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

  if (currentOrganizationId && currentOrganizationId !== task.organization_id) {
    throw new ForbiddenException('Task does not belong to the current organization context')
  }
}

export async function createSubmittedSnapshot(params: {
  dependencies: TaskExternalDependencies
  task: TaskRow
  assignment: AssignmentRow
  trx: TaskTransaction
}): Promise<void> {
  const { dependencies, task, assignment, trx } = params

  const existing = await dependencies.completion.assignmentSnapshotExists(
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

  const requiredSkills = await dependencies.completion.listRequiredSkillSnapshots(task.id, trx)

  await dependencies.completion.createAssignmentSnapshot(
    {
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
    },
    trx
  )
}

export async function stageSubmissionAuditAndFanout(params: {
  execCtx: TaskActionContext
  notificationFanout: NotificationFanoutStagerContract
  reviewGovernance: TaskSubmissionReviewGovernance
  submission: SubmissionRow
  task: TaskRow
  reviewSessionId: string | null
  evidenceCount: number
  trx: TaskTransaction
  now: Date
}): Promise<void> {
  const {
    execCtx,
    notificationFanout,
    reviewGovernance,
    submission,
    task,
    reviewSessionId,
    evidenceCount,
    trx,
    now,
  } = params

  await auditPublicApi.log(
    {
      user_id: submission.submitted_by,
      action: 'submit',
      entity_type: 'task_submission',
      entity_id: submission.id,
      old_values: null,
      new_values: {
        task_id: task.id,
        summary: submission.summary,
        evidence_count: evidenceCount,
      },
    },
    execCtx,
    { trx, critical: true }
  )

  const templateContext = {
    schemaVersion: 1 as const,
    scope: { kind: 'organization' as const, id: task.organization_id },
    actor: { type: 'user', id: submission.submitted_by },
    subject: { type: 'task', id: task.id },
    occurredAt: now.toISOString(),
    ...(execCtx.requestId ? { correlationId: execCtx.requestId } : {}),
  }
  await notificationFanout.stage(
    {
      ...templateContext,
      eventName: 'task.submission_submitted',
      businessEventId: submission.id,
      type: 'task_submitted',
      parameters: {
        taskTitle: task.title,
        submissionId: submission.id,
      },
    },
    [submission.submitted_by],
    { trx, now }
  )

  if (!reviewSessionId) {
    return
  }

  const audience = await reviewGovernance.loadNotificationAudience(
    reviewSessionId,
    submission.submitted_by,
    trx
  )

  if (!audience) {
    return
  }

  const reviewerIds = Array.from(
    new Set(audience.reviewerIds.filter((reviewerId) => reviewerId !== audience.sessionRevieweeId))
  )

  if (reviewerIds.length > 0) {
    await notificationFanout.stage(
      {
        ...templateContext,
        eventName: 'review.session_requested',
        businessEventId: reviewSessionId,
        type: 'review_requested',
        parameters: {
          taskTitle: task.title,
          reviewSessionId,
        },
      },
      reviewerIds,
      { trx, now }
    )
  }
}
