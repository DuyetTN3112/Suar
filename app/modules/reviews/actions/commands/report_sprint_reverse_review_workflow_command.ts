import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { queueAiDisputeEvaluationAfterReport } from '#modules/reviews/actions/support/ai_dispute_auto_queue'

interface WorkflowRecord {
  id: string
  sprint_id: string
  project_id: string
  organization_id: string
  reviewer_id: string
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
  status: string
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
  sprintId: string
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

async function loadPartyContext(
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
  const taskHistoryQuery = trx
    .from('user_work_history')
    .where('user_id', userId)
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
  const taskHistory = (await taskHistoryQuery
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
    .where('project_sprint_id', scope.sprintId)
    .where((builder) => {
      void builder.where('assigned_to', userId).orWhere('creator_id', userId)
    })
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

async function loadSprintReverseReviewReportContext(
  trx: TransactionClientContract,
  workflow: WorkflowRecord
): Promise<Record<string, unknown>> {
  const organization = (await trx
    .from('organizations')
    .where('id', workflow.organization_id)
    .select('id', 'name', 'slug', 'plan', 'owner_id')
    .first()) as Record<string, unknown> | undefined
  const project = (await trx
    .from('projects')
    .where('id', workflow.project_id)
    .select('id', 'name', 'status', 'visibility', 'organization_id', 'owner_id', 'manager_id')
    .first()) as Record<string, unknown> | undefined
  const sprint = (await trx
    .from('project_sprints')
    .where('id', workflow.sprint_id)
    .select('id', 'name', 'goal', 'status', 'organization_id', 'project_id', 'starts_at', 'ends_at')
    .first()) as Record<string, unknown> | undefined
  const relatedProjectTasks = (await trx
    .from('tasks')
    .where('project_id', workflow.project_id)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  const sprintPeerTasks = (await trx
    .from('tasks')
    .where('project_sprint_id', workflow.sprint_id)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
  let managerAssignedTasks: Record<string, unknown>[] = []
  if (workflow.target_type === 'assigner' && workflow.target_user_id) {
    const targetUserId = workflow.target_user_id
    managerAssignedTasks = (await trx
      .from('tasks as t')
      .leftJoin('task_assignments as ta', 'ta.task_id', 't.id')
      .where('t.project_sprint_id', workflow.sprint_id)
      .where('t.assigned_to', workflow.reviewer_id)
      .whereNull('t.deleted_at')
      .where((builder) => {
        void builder.where('t.creator_id', targetUserId).orWhere('ta.assigned_by', targetUserId)
      })
      .distinct(...TASK_CONTEXT_COLUMNS.map((column) => `t.${column}`))
      .orderBy('t.updated_at', 'desc')
      .limit(20)) as Record<string, unknown>[]
  }
  const responderId = workflow.responder_id ?? workflow.target_user_id
  const partyScope = {
    organizationId: workflow.organization_id,
    projectId: workflow.project_id,
    sprintId: workflow.sprint_id,
  }
  const reviewerContext = await loadPartyContext(trx, workflow.reviewer_id, partyScope)
  const revieweeContext = await loadPartyContext(trx, responderId, partyScope)

  return {
    schema_version: 'suar_sprint_reverse_review_report_context_v1',
    dispute_review_type:
      workflow.target_type === 'environment' ? 'environment_review' : 'manager_review',
    workflow_id: workflow.id,
    organization: organization ?? { id: workflow.organization_id },
    project: project ?? { id: workflow.project_id },
    sprint: sprint ?? { id: workflow.sprint_id },
    target: {
      type: workflow.target_type,
      user_id: workflow.target_user_id,
      entity_id: workflow.target_entity_id,
      responder_id: workflow.responder_id,
    },
    reviewer_context: reviewerContext,
    reviewee_context: revieweeContext,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
    manager_assigned_tasks: managerAssignedTasks,
  }
}

export default class ReportSprintReverseReviewWorkflowCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: {
    workflow_id: string
    body: string
  }): Promise<{ id: string; status: string }> {
    const actorId = this.requireUserId()
    const body = dto.body.trim()
    if (!body) {
      throw new BusinessLogicException('Review sau sprint report reason is required')
    }
    const trx = await db.transaction()

    try {
      const workflow = (await trx
        .from('sprint_reverse_review_workflows')
        .where('id', dto.workflow_id)
        .forUpdate()
        .first()) as WorkflowRecord | undefined
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.reviewer_id !== actorId && workflow.responder_id !== actorId) {
        throw new ForbiddenException('Only workflow participants can report review sau sprint')
      }
      if (workflow.status !== 'disputed') {
        throw new BusinessLogicException('Only disputed review sau sprint can be reported')
      }

      const now = DateTime.utc()
      const runtimeContext = await loadSprintReverseReviewReportContext(trx, workflow)
      await trx.from('sprint_reverse_review_workflows').where('id', workflow.id).update({
        status: 'reported',
        reported_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
      await trx.table('sprint_reverse_review_messages').insert({
        id: randomUUID(),
        workflow_id: workflow.id,
        author_id: actorId,
        message_type: 'report',
        body,
        metadata: JSON.stringify({ runtime_context: runtimeContext }),
        created_at: now.toSQL(),
      })

      await trx.commit()
      await queueAiDisputeEvaluationAfterReport({
        disputeId: workflow.id,
        sourceType: 'sprint_reverse_review_workflow',
        requestContext: this.execCtx,
      })
      return { id: workflow.id, status: 'reported' }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }
    return this.execCtx.userId
  }
}
