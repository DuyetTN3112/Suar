import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { BACKEND_NOTIFICATION_ENTITY_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewTaskWorkflow,
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowSeed,
  ReviewTaskWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task_review_workflow'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'
import {
  aiDisputeAutoQueuePublicApi,
  type AiDisputeAutoQueueCapability,
} from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

interface TaskWorkflowRow {
  id: string
  task_id: string
  project_id: string
  organization_id: string
  reviewee_id: string | null
  status: TaskReviewWorkflowStatus
  required_review_count: number | string
}

interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string | null
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

function mapWorkflow(row: TaskWorkflowRow): ReviewTaskWorkflow {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    revieweeId: row.reviewee_id,
    status: row.status,
    requiredReviewCount: Number(row.required_review_count),
  }
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

async function loadPartyContext(
  transaction: TransactionClientContract,
  userId: string | null,
  scope: PartyContextScope
): Promise<Record<string, unknown>> {
  if (!userId) {
    return { user_id: null, profile: {}, work_schedule: [], task_history: [] }
  }

  const user = (await transaction
    .from('users')
    .where('id', userId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined
  const profile = (await transaction
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
  const taskHistory = (await transaction
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
  const workScheduleQuery = transaction
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

async function loadReportRuntimeContext(
  transaction: TransactionClientContract,
  workflowId: string,
  reporterId: string,
  reportReason: string
): Promise<Record<string, unknown>> {
  const workflow = (await transaction
    .from('task_review_workflows')
    .where('id', workflowId)
    .firstOrFail()) as Record<string, unknown>
  const taskId = String(workflow['task_id'])
  const task = (await transaction
    .from('tasks')
    .where('id', taskId)
    .select(...TASK_CONTEXT_COLUMNS)
    .first()) as Record<string, unknown> | undefined
  const organizationId =
    stringField(workflow['organization_id']) || stringField(task?.['organization_id'])
  const projectId = stringField(workflow['project_id']) || stringField(task?.['project_id'])
  const sprintId =
    typeof task?.['project_sprint_id'] === 'string' ? task['project_sprint_id'] : null
  const organization = (await transaction
    .from('organizations')
    .where('id', organizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await transaction
    .from('projects')
    .where('id', projectId)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const sprint = sprintId
    ? ((await transaction
        .from('project_sprints')
        .where('id', sprintId)
        .select(
          'id',
          'name',
          'goal',
          'status',
          'organization_id',
          'project_id',
          'starts_at',
          'ends_at'
        )
        .first()) as Record<string, unknown> | undefined)
    : null
  const assignment = (await transaction
    .from('task_assignments')
    .where('task_id', taskId)
    .orderBy('id', 'desc')
    .first()) as Record<string, unknown> | undefined
  const reviewers = (await transaction
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .select(
      'id',
      'workflow_id',
      'reviewer_id',
      'reviewer_role',
      'status',
      'priority_rank',
      'reviewed_at'
    )
    .orderBy('priority_rank', 'asc')) as Record<string, unknown>[]
  const messages = (await transaction
    .from('task_review_messages')
    .where('workflow_id', workflowId)
    .select('id', 'workflow_id', 'author_id', 'body', 'message_type', 'metadata', 'created_at')
    .orderBy('created_at', 'asc')) as Record<string, unknown>[]
  const relatedProjectTasks = (await transaction
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = sprintId
    ? ((await transaction
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
      context: await loadPartyContext(
        transaction,
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
    task_giver_context: await loadPartyContext(transaction, taskGiverId, partyScope),
    reviewee_context: await loadPartyContext(transaction, revieweeId, partyScope),
    reporter_context: await loadPartyContext(transaction, reporterId, partyScope),
    reviewer_contexts: reviewerContexts,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    comments: messages,
  }
}

class LucidReviewTaskWorkflowSession implements ReviewTaskWorkflowPersistenceSession {
  constructor(
    private readonly transaction: TransactionClientContract,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability
  ) {}

  async findWorkflowByTaskId(taskId: string): Promise<ReviewTaskWorkflow | null> {
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('task_id', taskId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async loadWorkflow(workflowId: string): Promise<ReviewTaskWorkflow | null> {
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('id', workflowId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async loadWorkflowSeed(taskId: string): Promise<ReviewTaskWorkflowSeed | null> {
    const seed = (await this.transaction
      .from('tasks as t')
      .leftJoin('task_assignments as ta', (join) => {
        join.on('ta.task_id', 't.id').andOnVal('ta.assignment_status', 'completed')
      })
      .where('t.id', taskId)
      .whereNull('t.deleted_at')
      .select(
        't.id as task_id',
        't.project_id',
        't.organization_id',
        't.assigned_to as reviewee_id',
        't.creator_id',
        'ta.assigned_by as assigner_id'
      )
      .orderBy('ta.completed_at', 'desc')
      .first()) as
      | {
          task_id: string
          project_id: string
          organization_id: string
          reviewee_id: string | null
          assigner_id: string | null
          creator_id: string
        }
      | undefined

    return seed
      ? {
          taskId: seed.task_id,
          projectId: seed.project_id,
          organizationId: seed.organization_id,
          revieweeId: seed.reviewee_id,
          assignerId: seed.assigner_id,
          creatorId: seed.creator_id,
        }
      : null
  }

  async listReviewerCandidates(
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<
    Array<{ userId: string; projectRole: string | null; organizationRole: string | null }>
  > {
    const candidates = (await this.transaction
      .from('project_members as pm')
      .join('organization_users as ou', (join) => {
        join.on('ou.user_id', 'pm.user_id').andOnVal('ou.status', 'approved')
      })
      .where('pm.project_id', projectId)
      .where('ou.organization_id', organizationId)
      .whereNotIn('pm.user_id', Array.from(excludedUserIds))
      .select('pm.user_id', 'pm.project_role', 'ou.org_role')
      .select(
        this.transaction.raw(`
          CASE
            WHEN pm.project_role = 'project_owner' THEN 10
            WHEN pm.project_role = 'project_manager' THEN 20
            WHEN ou.org_role = 'org_owner' THEN 30
            WHEN ou.org_role = 'org_admin' THEN 40
            WHEN pm.project_role = 'project_member' THEN 80
            ELSE 100
          END as priority_rank
        `)
      )
      .orderBy('priority_rank', 'asc')
      .orderBy('pm.created_at', 'asc')) as Array<{
      user_id: string
      project_role: string | null
      org_role: string | null
    }>

    return candidates.map((candidate) => ({
      userId: candidate.user_id,
      projectRole: candidate.project_role,
      organizationRole: candidate.org_role,
    }))
  }

  async createWorkflow(input: {
    taskId: string
    projectId: string
    organizationId: string
    revieweeId: string | null
    requiredReviewCount: number
  }): Promise<ReviewTaskWorkflow | null> {
    const insertedRows = (await this.transaction
      .table('task_review_workflows')
      .insert({
        task_id: input.taskId,
        project_id: input.projectId,
        organization_id: input.organizationId,
        reviewee_id: input.revieweeId,
        status: 'awaiting_review',
        required_review_count: input.requiredReviewCount,
        completed_review_count: 0,
      })
      .returning([
        'id',
        'task_id',
        'project_id',
        'organization_id',
        'reviewee_id',
        'status',
        'required_review_count',
      ])) as TaskWorkflowRow[]

    return insertedRows[0] ? mapWorkflow(insertedRows[0]) : null
  }

  async createWorkflowReviewers(
    workflowId: string,
    reviewers: ReadonlyArray<{ reviewerId: string; role: string; priorityRank: number }>
  ): Promise<void> {
    if (reviewers.length === 0) return

    await this.transaction.table('task_review_reviewers').insert(
      reviewers.map((reviewer) => ({
        workflow_id: workflowId,
        reviewer_id: reviewer.reviewerId,
        reviewer_role: reviewer.role,
        is_required: true,
        status: 'pending',
        priority_rank: reviewer.priorityRank,
      }))
    )
  }

  async loadTaskAssignee(taskId: string): Promise<string | null | undefined> {
    const task = (await this.transaction
      .from('tasks')
      .where('id', taskId)
      .whereNull('deleted_at')
      .select('assigned_to')
      .first()) as { assigned_to: string | null } | undefined

    return task?.assigned_to
  }

  async findReviewer(
    workflowId: string,
    reviewerId: string
  ): Promise<{ id: string; status: string } | null> {
    const reviewer = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .where('reviewer_id', reviewerId)
      .select('id', 'status')
      .first()) as { id: string; status: string } | undefined

    return reviewer ?? null
  }

  async listReviewerIds(workflowId: string): Promise<string[]> {
    const rows = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .select('reviewer_id')) as Array<{ reviewer_id: string }>

    return rows.map((row) => row.reviewer_id)
  }

  async markReviewerSubmitted(reviewerId: string, reviewedAt: Date): Promise<void> {
    await this.transaction.from('task_review_reviewers').where('id', reviewerId).update({
      status: 'submitted',
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
  }

  async appendMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['appendMessage']>[0]
  ): Promise<void> {
    await this.transaction.table('task_review_messages').insert({
      workflow_id: input.workflowId,
      author_id: input.authorId,
      message_type: input.messageType,
      body: input.body,
      ...(input.metadata ? { metadata: JSON.stringify(input.metadata) } : {}),
    })
  }

  async countSubmittedReviewers(workflowId: string): Promise<number> {
    const row = (await this.transaction
      .from('task_review_reviewers')
      .where('workflow_id', workflowId)
      .where('status', 'submitted')
      .count('* as total')
      .first()) as { total?: number | string } | undefined

    return Number(row?.total ?? 0)
  }

  async updateWorkflowProgress(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['updateWorkflowProgress']>[0]
  ): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', input.workflowId).update({
      completed_review_count: input.completedReviewCount,
      status: input.status,
      updated_at: input.updatedAt,
    })
  }

  async markDisputed(workflowId: string, updatedAt: Date): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', workflowId).update({
      status: 'disputed',
      updated_at: updatedAt,
    })
  }

  loadReportRuntimeContext(
    workflowId: string,
    reporterId: string,
    reportReason: string
  ): Promise<Record<string, unknown>> {
    return loadReportRuntimeContext(this.transaction, workflowId, reporterId, reportReason)
  }

  async markReported(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['markReported']>[0]
  ): Promise<void> {
    await this.transaction
      .from('task_review_workflows')
      .where('id', input.workflowId)
      .update({
        status: 'reported',
        reported_by: input.reporterId,
        reported_at: input.reportedAt,
        runtime_context: JSON.stringify(input.runtimeContext),
        updated_at: input.reportedAt,
      })
  }

  async stageNotification(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['stageNotification']>[0]
  ): Promise<void> {
    const recipientIds = [...new Set(input.recipientIds)].filter(
      (recipientId) => recipientId !== input.actorId
    )
    if (recipientIds.length === 0) return

    await this.notificationFanout.stage(
      {
        eventName: input.eventName,
        businessEventId: input.businessEventId,
        type: input.type,
        schemaVersion: 1,
        scope: { kind: 'organization', id: input.organizationId },
        actor: { type: 'user', id: input.actorId },
        subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: input.taskId },
        parameters: input.parameters,
        occurredAt: input.occurredAt.toISOString(),
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      recipientIds,
      { trx: this.transaction, now: input.occurredAt }
    )
  }

  async stageAiDisputeAutoQueue(
    workflowId: string,
    execCtx: Parameters<ReviewTaskWorkflowPersistenceSession['stageAiDisputeAutoQueue']>[1]
  ): Promise<void> {
    await this.aiDisputeAutoQueue.stage(this.transaction, {
      sourceType: 'task_review_workflow',
      sourceId: workflowId,
      requestContext: execCtx,
    })
  }
}

export default class LucidReviewTaskWorkflowUnitOfWork implements ReviewTaskWorkflowUnitOfWork {
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability = aiDisputeAutoQueuePublicApi
  ) {}

  run<T>(work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(
        new LucidReviewTaskWorkflowSession(
          transaction,
          this.notificationFanout,
          this.aiDisputeAutoQueue
        )
      )
    )
  }

  runIn<T>(
    transaction: ReviewTransaction,
    work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>
  ): Promise<T> {
    return work(
      new LucidReviewTaskWorkflowSession(
        toLucidReviewTransaction(transaction),
        this.notificationFanout,
        this.aiDisputeAutoQueue
      )
    )
  }
}
