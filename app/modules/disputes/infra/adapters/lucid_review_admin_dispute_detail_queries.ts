import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ReviewAdminDisputeDetailSnapshot } from '#modules/disputes/actions/ports/outbound/review_admin_dispute_read_model'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

export async function loadAuditEvents(
  client: ReturnType<typeof db.connection> | TransactionClientContract,
  entityType: 'review_dispute' | 'sprint_review_dispute',
  entityId: string
): Promise<Record<string, unknown>[]> {
  return (await client
    .from('audit_events as ae')
    .leftJoin('users as actor', 'actor.id', 'ae.user_id')
    .where('ae.entity_type', entityType)
    .where('ae.entity_id', entityId)
    .select(
      'ae.id',
      'ae.action',
      'ae.user_id',
      'ae.new_values',
      'ae.occurred_at',
      'ae.created_at',
      db.raw(
        "COALESCE(actor.username, actor.email, CAST(ae.user_id AS text), 'system') as actor_label"
      )
    )
    .orderBy('ae.occurred_at', 'desc')) as Record<string, unknown>[]
}

export async function loadWorkflowMessages(
  client: ReturnType<typeof db.connection> | TransactionClientContract,
  table: 'sprint_reverse_review_messages' | 'task_review_messages',
  workflowId: string
): Promise<Record<string, unknown>[]> {
  return (await client
    .from(table)
    .where('workflow_id', workflowId)
    .orderBy('created_at', 'asc')
    .select(
      'id',
      'workflow_id as dispute_id',
      'author_id',
      'body',
      'message_type as visibility',
      'metadata',
      'created_at',
      db.raw('NULL as author_context')
    )) as Record<string, unknown>[]
}

export async function loadClassicDisputeDetail(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReviewAdminDisputeDetailSnapshot | null> {
  const classic = (await trx
    .from('review_disputes as rd')
    .leftJoin('tasks as t', 't.id', 'rd.task_id')
    .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
    .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id')
    .where('rd.id', disputeId)
    .select(
      'rd.*',
      't.title as task_title',
      't.description as task_description',
      't.organization_id',
      't.project_id',
      'rs.status as review_session_status',
      'rs.overall_quality_score as review_overall_score',
      'rs.strengths_observed as review_strengths',
      'rs.areas_for_improvement as review_improvements',
      'reviewee.username as reviewee_username',
      'reviewee.email as reviewee_email'
    )
    .first()) as Record<string, unknown> | undefined

  if (!classic) return null

  const auditEvents = await loadAuditEvents(trx, 'review_dispute', disputeId)
  return {
    sourceType: 'review_dispute',
    dispute: classic,
    comments: [],
    auditEvents,
  }
}

export async function loadSprintDisputeDetail(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReviewAdminDisputeDetailSnapshot | null> {
  const sprint = (await trx
    .from('sprint_review_disputes as srd')
    .joinRaw('inner join sprint_review_packages as srp on srp.id::text = srd.package_id')
    .joinRaw('inner join project_sprints as ps on ps.id::text = srp.sprint_id')
    .joinRaw('left join projects as p on p.id::text = ps.project_id')
    .joinRaw('left join organizations as org on org.id::text = ps.organization_id')
    .joinRaw('left join users as reviewer on reviewer.id::text = srp.reviewer_id')
    .where('srd.id', disputeId)
    .select(
      'srd.*',
      'srd.dispute_review_type',
      'srd.runtime_context',
      'ps.organization_id',
      'ps.project_id',
      'ps.id as sprint_id',
      'ps.name as sprint_name',
      'p.name as project_name',
      'org.name as organization_name',
      'srp.reviewer_id as reviewee_id',
      'reviewer.username as reviewee_username',
      'reviewer.email as reviewee_email'
    )
    .first()) as Record<string, unknown> | undefined

  if (!sprint) return null

  const comments = (await trx
    .from('sprint_review_dispute_comments')
    .where('dispute_id', disputeId)
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select(
      'id',
      'dispute_id',
      'author_id',
      'body',
      'visibility',
      'created_at',
      db.raw('NULL as author_context')
    )) as Record<string, unknown>[]
  const auditEvents = await loadAuditEvents(trx, 'sprint_review_dispute', disputeId)
  return {
    sourceType: 'sprint_review_dispute',
    dispute: sprint,
    comments,
    auditEvents,
  }
}

export async function loadReverseDisputeDetail(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReviewAdminDisputeDetailSnapshot | null> {
  const reverse = (await trx
    .from('sprint_reverse_review_workflows as srw')
    .joinRaw('inner join project_sprints as ps on ps.id::text = srw.sprint_id::text')
    .joinRaw('left join projects as p on p.id::text = srw.project_id::text')
    .joinRaw('left join organizations as org on org.id::text = srw.organization_id::text')
    .joinRaw('left join users as reviewer on reviewer.id::text = srw.reviewer_id::text')
    .where('srw.id', disputeId)
    .whereIn('srw.status', ['reported', 'ai_reviewing', 'admin_reviewing', 'resolved'])
    .select(
      'srw.*',
      db.raw(
        "CASE WHEN srw.target_type = 'environment' THEN 'environment_review' ELSE 'manager_review' END as dispute_review_type"
      ),
      'ps.name as sprint_name',
      'p.name as project_name',
      'org.name as organization_name',
      'srw.reviewer_id as reviewee_id',
      'reviewer.username as reviewee_username',
      'reviewer.email as reviewee_email'
    )
    .first()) as Record<string, unknown> | undefined

  if (!reverse) return null

  const messages = await loadWorkflowMessages(
    trx,
    'sprint_reverse_review_messages',
    disputeId
  )
  return {
    sourceType: 'sprint_reverse_review_workflow',
    dispute: reverse,
    comments: messages,
    auditEvents: [],
  }
}

export async function loadTaskWorkflowDisputeDetail(
  trx: TransactionClientContract,
  disputeId: string
): Promise<ReviewAdminDisputeDetailSnapshot | null> {
  const task = (await trx
    .from('task_review_workflows as trw')
    .leftJoin('tasks as t', 't.id', 'trw.task_id')
    .joinRaw('left join project_sprints as ps on ps.id::text = t.project_sprint_id::text')
    .joinRaw('left join projects as p on p.id::text = trw.project_id::text')
    .joinRaw('left join organizations as org on org.id::text = trw.organization_id::text')
    .leftJoin('users as reviewee', 'reviewee.id', 'trw.reviewee_id')
    .where('trw.id', disputeId)
    .whereIn('trw.status', [
      'reported',
      'ai_reviewing',
      'ai_failed',
      'admin_reviewing',
      'resolved',
      'done',
    ])
    .select(
      'trw.*',
      db.raw("'task_review' as dispute_review_type"),
      't.title as task_title',
      't.description as task_description',
      't.project_sprint_id as sprint_id',
      'ps.name as sprint_name',
      'p.name as project_name',
      'org.name as organization_name',
      'reviewee.username as reviewee_username',
      'reviewee.email as reviewee_email'
    )
    .first()) as Record<string, unknown> | undefined

  if (!task) return null

  const [messages, taskReviewDetail] = await Promise.all([
    loadWorkflowMessages(trx, 'task_review_messages', disputeId),
    getTaskReviewDetailByTask(String(task['task_id'])),
  ])
  return {
    sourceType: 'task_review_workflow',
    dispute: { ...task, task_review_detail: taskReviewDetail },
    comments: messages,
    auditEvents: [],
  }
}
