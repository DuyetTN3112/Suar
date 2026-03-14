import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { queueAiDisputeEvaluationAfterReport } from '#modules/reviews/actions/support/ai_dispute_auto_queue'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface ReportTaskReviewDisputeDTO {
  workflowId: string
  reason: string
}

interface ReportableTaskReviewWorkflowRow {
  reviewee_id: string
}

const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
]

interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string | null
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parseJsonFields(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const field of fields) {
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function loadTaskReviewPartyContext(
  trx: TransactionClientContract,
  userId: string | null,
  scope: PartyContextScope
): Promise<Record<string, unknown>> {
  if (!userId) {
    return { user_id: null, profile: {}, work_schedule: [], task_history: [] }
  }

  const user = (await trx
    .from('users')
    .where('id', userId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined
  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', userId)
    .select(
      'id',
      'version',
      'snapshot_name',
      'is_current',
      'is_public',
      'summary',
      'skills_verified',
      'work_highlights',
      'performance_metrics',
      'trust_metrics',
      'scoring_version',
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined
  const taskHistory = (await trx
    .from('user_work_history')
    .where('user_id', userId)
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .select(
      'id',
      'task_id',
      'task_assignment_id',
      'organization_id',
      'project_id',
      'task_title',
      'task_type',
      'business_domain',
      'problem_category',
      'role_in_task',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .orderBy('created_at', 'desc')
    .limit(10)) as Record<string, unknown>[]
  const workScheduleQuery = trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where((builder) => {
      void builder.where('assigned_to', userId).orWhere('creator_id', userId)
    })
  if (scope.sprintId) {
    void workScheduleQuery.where('project_sprint_id', scope.sprintId)
  }
  const workSchedule = (await workScheduleQuery
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: userId,
    username: user?.['username'] ?? null,
    system_role: user?.['system_role'] ?? null,
    current_organization_id: user?.['current_organization_id'] ?? null,
    timezone: user?.['timezone'] ?? null,
    status: user?.['status'] ?? null,
    profile: profile
      ? parseJsonFields(profile, [
          'summary',
          'skills_verified',
          'work_highlights',
          'performance_metrics',
          'trust_metrics',
        ])
      : {},
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}

async function loadTaskReviewWorkflowRuntimeContext(
  trx: TransactionClientContract,
  workflowId: string,
  reporterId: string,
  reportReason: string
): Promise<Record<string, unknown>> {
  const workflow = (await trx
    .from('task_review_workflows')
    .where('id', workflowId)
    .firstOrFail()) as Record<string, unknown>
  const taskId = String(workflow['task_id'])
  const task = (await trx
    .from('tasks')
    .where('id', taskId)
    .select(...TASK_CONTEXT_COLUMNS)
    .first()) as Record<string, unknown> | undefined
  const organizationId = stringField(workflow['organization_id']) || stringField(task?.['organization_id'])
  const projectId = stringField(workflow['project_id']) || stringField(task?.['project_id'])
  const sprintId =
    typeof task?.['project_sprint_id'] === 'string' ? task['project_sprint_id'] : null
  const organization = (await trx
    .from('organizations')
    .where('id', organizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await trx
    .from('projects')
    .where('id', projectId)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const sprint = sprintId
    ? ((await trx
        .from('project_sprints')
        .where('id', sprintId)
        .select('id', 'name', 'goal', 'status', 'organization_id', 'project_id', 'starts_at', 'ends_at')
        .first()) as Record<string, unknown> | undefined)
    : null
  const assignment = (await trx
    .from('task_assignments')
    .where('task_id', taskId)
    .orderBy('id', 'desc')
    .first()) as Record<string, unknown> | undefined
  const reviewers = (await trx
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .select('id', 'workflow_id', 'reviewer_id', 'reviewer_role', 'status', 'priority_rank', 'reviewed_at')
    .orderBy('priority_rank', 'asc')) as Record<string, unknown>[]
  const messages = (await trx
    .from('task_review_messages')
    .where('workflow_id', workflowId)
    .select('id', 'workflow_id', 'author_id', 'body', 'message_type', 'metadata', 'created_at')
    .orderBy('created_at', 'asc')) as Record<string, unknown>[]
  const relatedProjectTasks = (await trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = sprintId
    ? ((await trx
        .from('tasks')
        .where('project_sprint_id', sprintId)
        .whereNull('deleted_at')
        .select(...TASK_CONTEXT_COLUMNS)
        .orderBy('updated_at', 'desc')
        .limit(20)) as Record<string, unknown>[])
    : []
  const partyScope = { organizationId, projectId, sprintId }
  const revieweeId =
    typeof workflow['reviewee_id'] === 'string'
      ? workflow['reviewee_id']
      : typeof task?.['assigned_to'] === 'string'
        ? task['assigned_to']
        : null
  const taskGiverId =
    typeof assignment?.['assigned_by'] === 'string'
      ? assignment['assigned_by']
      : typeof task?.['creator_id'] === 'string'
        ? task['creator_id']
        : null
  const reviewerContexts: Record<string, unknown>[] = []
  for (const reviewer of reviewers) {
    reviewerContexts.push({
      reviewer,
      context: await loadTaskReviewPartyContext(
        trx,
        typeof reviewer['reviewer_id'] === 'string' ? reviewer['reviewer_id'] : null,
        partyScope
      ),
    })
  }

  return {
    schema_version: 'suar_task_review_workflow_runtime_context_v1',
    source_type: 'task_review_workflow',
    dispute_review_type: 'task_review',
    workflow,
    organization: organization ?? { id: organizationId },
    project: project ?? { id: projectId },
    sprint: sprint ?? (sprintId ? { id: sprintId } : null),
    task: task ?? { id: taskId },
    assignment: assignment ?? null,
    dispute_claim: {
      dispute_reason: reportReason,
      requested_outcome: 'request_admin_review',
    },
    task_giver_context: await loadTaskReviewPartyContext(trx, taskGiverId, partyScope),
    reviewee_context: await loadTaskReviewPartyContext(trx, revieweeId, partyScope),
    reporter_context: await loadTaskReviewPartyContext(trx, reporterId, partyScope),
    reviewer_contexts: reviewerContexts,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    comments: messages,
  }
}

export default class ReportTaskReviewDisputeCommand extends BaseCommand<
  ReportTaskReviewDisputeDTO,
  void
> {
  async handle(dto: ReportTaskReviewDisputeDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    await this.executeInTransaction(async (trx) => {
      const workflow = (await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .firstOrFail()) as ReportableTaskReviewWorkflowRow
      const reviewer: unknown = await trx
        .from('task_review_reviewers')
        .where('workflow_id', dto.workflowId)
        .where('reviewer_id', userId)
        .first()

      if (workflow.reviewee_id !== userId && (reviewer === null || reviewer === undefined)) {
        throw new BusinessLogicException('Chỉ reviewer hoặc người được review mới được gửi report')
      }

      const runtimeContext = await loadTaskReviewWorkflowRuntimeContext(
        trx,
        dto.workflowId,
        userId,
        dto.reason
      )
      const now = DateTime.now().toSQL()
      await trx.table('task_review_messages').insert({
        workflow_id: dto.workflowId,
        author_id: userId,
        message_type: 'system',
        body: `Task review dispute reported: ${dto.reason}`,
        metadata: JSON.stringify({ runtime_context: runtimeContext }),
      })
      await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .update({
          status: TASK_REVIEW_WORKFLOW_STATUSES.REPORTED,
          reported_by: userId,
          reported_at: now,
          runtime_context: JSON.stringify(runtimeContext),
          updated_at: now,
        })
    })
    await queueAiDisputeEvaluationAfterReport({
      disputeId: dto.workflowId,
      sourceType: 'task_review_workflow',
      requestContext: this.execCtx,
    })
  }

  async execute(dto: ReportTaskReviewDisputeDTO): Promise<void> {
    return this.handle(dto)
  }
}
