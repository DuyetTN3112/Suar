import db from '@adonisjs/lucid/services/db'

import { rollbackWithoutMaskingOriginalError } from '#modules/logger/public_contracts/transaction_rollback'
import type {
  ReviewAdminDisputeCursor,
  ReviewAdminDisputeDetailSnapshot,
  ReviewAdminDisputeListReadInput,
  ReviewAdminDisputeListSnapshot,
  ReviewAdminDisputeReadModel,
} from '#modules/reviews/actions/ports/outbound/review_admin_dispute_read_model'

type FilterInput = ReviewAdminDisputeListReadInput['filters']

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function applyClassicFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('rd.status', filters.status.trim())
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ? OR rd.reviewee_id = ?)', [
        term,
        term,
        needle,
      ])
    } else {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.where('rd.requested_outcome', filters.requestedOutcome.trim())
  }
  if (filters.finalDecision?.trim()) {
    void query.where('rd.final_decision', filters.finalDecision.trim())
  }
  return query
}

function applySprintFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('srd.status', filters.status.trim())
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw(
        '(srd.dispute_reason ILIKE ? OR ps.name ILIKE ? OR srp.reviewer_id = ?)',
        [term, term, needle]
      )
    } else {
      void query.whereRaw('(srd.dispute_reason ILIKE ? OR ps.name ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.where('srd.requested_outcome', filters.requestedOutcome.trim())
  }
  if (filters.finalDecision?.trim()) {
    void query.where('srd.final_decision', filters.finalDecision.trim())
  }
  return query
}

function applyReverseWorkflowFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('srw.status', filters.status.trim())
  } else {
    void query.whereIn('srw.status', ['reported', 'ai_reviewing', 'resolved'])
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(srw.comment ILIKE ? OR ps.name ILIKE ? OR srw.reviewer_id = ?)', [
        term,
        term,
        needle,
      ])
    } else {
      void query.whereRaw('(srw.comment ILIKE ? OR ps.name ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.whereRaw('1 = 0')
  }
  if (filters.finalDecision?.trim()) {
    void query.where('srw.final_decision', filters.finalDecision.trim())
  }
  return query
}

function applyTaskWorkflowFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('trw.status', filters.status.trim())
  } else {
    void query.whereIn('trw.status', ['reported', 'ai_reviewing', 'resolved'])
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(t.title ILIKE ? OR trw.reviewee_id = ? OR trw.reported_by = ?)', [
        term,
        needle,
        needle,
      ])
    } else {
      void query.whereRaw('(t.title ILIKE ?)', [term])
    }
  }

  if (
    filters.requestedOutcome?.trim() &&
    filters.requestedOutcome.trim() !== 'request_admin_review'
  ) {
    void query.whereRaw('1 = 0')
  }
  if (filters.finalDecision?.trim()) {
    void query.where('trw.final_decision', filters.finalDecision.trim())
  }
  return query
}

function applyCursorWindow(
  query: ReturnType<typeof db.query>,
  alias: string,
  after: ReviewAdminDisputeCursor | null,
  before: ReviewAdminDisputeCursor | null
) {
  if (after) {
    void query.where((builder) => {
      void builder.where(`${alias}.created_at`, '<', after.createdAt).orWhere((nested) => {
        void nested
          .where(`${alias}.created_at`, after.createdAt)
          .where(`${alias}.id`, '<', after.id)
      })
    })
  } else if (before) {
    void query.where((builder) => {
      void builder.where(`${alias}.created_at`, '>', before.createdAt).orWhere((nested) => {
        void nested
          .where(`${alias}.created_at`, before.createdAt)
          .where(`${alias}.id`, '>', before.id)
      })
    })
  }
  return query
}

function sortRows(
  rows: Record<string, unknown>[],
  direction: 'asc' | 'desc'
): Record<string, unknown>[] {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left['created_at'] as string | Date).getTime()
    const rightTime = new Date(right['created_at'] as string | Date).getTime()
    if (leftTime !== rightTime) {
      return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime
    }
    const leftId = String(left['id'])
    const rightId = String(right['id'])
    return direction === 'asc' ? leftId.localeCompare(rightId) : rightId.localeCompare(leftId)
  })
}

function latestErrorSql(alias: string, sourceType?: string): string {
  const sourceClause = sourceType
    ? `ade.source_type = '${sourceType}' AND ade.source_id::text = ${alias}.id::text`
    : `ade.dispute_id = ${alias}.id`
  return `(SELECT ade.error_message FROM ai_dispute_evaluations ade WHERE ${sourceClause} AND ade.status IN ('failed', 'cancelled') ORDER BY ade.created_at DESC, ade.id DESC LIMIT 1)`
}

export default class LucidReviewAdminDisputeReadModel implements ReviewAdminDisputeReadModel {
  async findActorSystemRole(actorId: string): Promise<string | null | undefined> {
    const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
      | { system_role?: string | null }
      | undefined
    return actor ? (actor.system_role ?? null) : undefined
  }

  async listDisputes(
    input: ReviewAdminDisputeListReadInput
  ): Promise<ReviewAdminDisputeListSnapshot> {
    const classicBase = applyClassicFilters(
      db
        .from('review_disputes as rd')
        .leftJoin('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id'),
      input.filters
    ).whereNotNull('rd.reported_to_admin_at')
    const sprintBase = applySprintFilters(
      db
        .from('sprint_review_disputes as srd')
        .joinRaw('inner join sprint_review_packages as srp on srp.id::text = srd.package_id')
        .joinRaw('inner join project_sprints as ps on ps.id::text = srp.sprint_id')
        .joinRaw('left join users as reviewer on reviewer.id::text = srp.reviewer_id'),
      input.filters
    ).whereNotNull('srd.reported_to_admin_at')
    const reverseBase = applyReverseWorkflowFilters(
      db
        .from('sprint_reverse_review_workflows as srw')
        .joinRaw('inner join project_sprints as ps on ps.id::text = srw.sprint_id::text')
        .joinRaw('left join users as reviewer on reviewer.id::text = srw.reviewer_id::text'),
      input.filters
    )
    const taskBase = applyTaskWorkflowFilters(
      db
        .from('task_review_workflows as trw')
        .leftJoin('tasks as t', 't.id', 'trw.task_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'trw.reviewee_id'),
      input.filters
    )

    const [classicTotal, sprintTotal, reverseTotal, taskTotal] = (await Promise.all([
      classicBase.clone().clearSelect().countDistinct('rd.id as total').first(),
      sprintBase.clone().clearSelect().countDistinct('srd.id as total').first(),
      reverseBase.clone().clearSelect().countDistinct('srw.id as total').first(),
      taskBase.clone().clearSelect().countDistinct('trw.id as total').first(),
    ])) as Array<{ total?: number | string } | undefined>
    const total =
      Number(classicTotal?.total ?? 0) +
      Number(sprintTotal?.total ?? 0) +
      Number(reverseTotal?.total ?? 0) +
      Number(taskTotal?.total ?? 0)
    const isBeforeWindow = Boolean(input.before && !input.after)
    const direction = isBeforeWindow ? 'asc' : 'desc'

    const classicPage = applyCursorWindow(classicBase.clone(), 'rd', input.after, input.before)
    const sprintPage = applyCursorWindow(sprintBase.clone(), 'srd', input.after, input.before)
    const reversePage = applyCursorWindow(reverseBase.clone(), 'srw', input.after, input.before)
    const taskPage = applyCursorWindow(taskBase.clone(), 'trw', input.after, input.before)

    const [classicRows, sprintRows, reverseRows, taskRows] = await Promise.all([
      classicPage
        .select(
          db.raw("'review_dispute' as source_type"),
          db.raw("'task_review' as dispute_review_type"),
          'rd.*',
          't.organization_id',
          't.project_id',
          't.project_sprint_id as sprint_id',
          't.title as task_title',
          'rs.status as review_session_status',
          'reviewee.username as reviewee_username',
          db.raw(
            '(SELECT COUNT(*)::int FROM review_dispute_comments rdc WHERE rdc.dispute_id = rd.id AND rdc.deleted_at IS NULL) as comments_count'
          ),
          db.raw(
            '(SELECT COUNT(*)::int FROM review_dispute_evidences rde WHERE rde.dispute_id = rd.id) as evidences_count'
          ),
          db.raw(
            '(SELECT MAX(rdcf.case_version)::int FROM review_dispute_case_files rdcf WHERE rdcf.dispute_id = rd.id) as latest_case_version'
          ),
          db.raw(
            '(SELECT COUNT(*)::int FROM ai_dispute_evaluations ade WHERE ade.dispute_id = rd.id) as ai_evaluations_count'
          ),
          db.raw(`${latestErrorSql('rd')} as last_error_message`)
        )
        .orderBy('rd.created_at', direction)
        .orderBy('rd.id', direction)
        .limit(input.limit),
      sprintPage
        .select(
          db.raw("'sprint_review_dispute' as source_type"),
          'srd.dispute_review_type',
          'srd.id',
          db.raw('NULL as review_session_id'),
          db.raw('NULL as task_assignment_id'),
          db.raw('NULL as task_id'),
          'ps.organization_id',
          'ps.project_id',
          'ps.id as sprint_id',
          'srp.reviewer_id as reviewee_id',
          'srd.opened_by',
          'srd.status',
          'srd.dispute_reason',
          'srd.requested_outcome',
          'srd.final_decision',
          'srd.final_rationale',
          'srd.created_at',
          'srd.resolved_at',
          'ps.name as task_title',
          db.raw('NULL as review_session_status'),
          'reviewer.username as reviewee_username',
          db.raw(
            '(SELECT COUNT(*)::int FROM sprint_review_dispute_comments srdc WHERE srdc.dispute_id = srd.id AND srdc.deleted_at IS NULL) as comments_count'
          ),
          db.raw('0::int as evidences_count'),
          db.raw('NULL::int as latest_case_version'),
          db.raw(
            "(SELECT COUNT(*)::int FROM ai_dispute_evaluations ade WHERE ade.source_type = 'sprint_review_dispute' AND ade.source_id::text = srd.id::text) as ai_evaluations_count"
          ),
          db.raw(`${latestErrorSql('srd', 'sprint_review_dispute')} as last_error_message`)
        )
        .orderBy('srd.created_at', direction)
        .orderBy('srd.id', direction)
        .limit(input.limit),
      reversePage
        .select(
          db.raw("'sprint_reverse_review_workflow' as source_type"),
          db.raw(
            "CASE WHEN srw.target_type = 'environment' THEN 'environment_review' ELSE 'manager_review' END as dispute_review_type"
          ),
          'srw.id',
          db.raw('NULL as review_session_id'),
          db.raw('NULL as task_assignment_id'),
          db.raw('NULL as task_id'),
          'srw.organization_id',
          'srw.project_id',
          'srw.sprint_id',
          'srw.reviewer_id as reviewee_id',
          'srw.reviewer_id as opened_by',
          'srw.status',
          db.raw(
            "COALESCE((SELECT srrm.body FROM sprint_reverse_review_messages srrm WHERE srrm.workflow_id = srw.id AND srrm.message_type = 'report' ORDER BY srrm.created_at DESC LIMIT 1), srw.comment, 'Sprint reverse review reported') as dispute_reason"
          ),
          db.raw("'request_admin_review' as requested_outcome"),
          'srw.final_decision',
          'srw.final_rationale',
          'srw.created_at',
          'srw.resolved_at',
          'ps.name as task_title',
          db.raw('NULL as review_session_status'),
          'reviewer.username as reviewee_username',
          db.raw(
            '(SELECT COUNT(*)::int FROM sprint_reverse_review_messages srrm WHERE srrm.workflow_id = srw.id) as comments_count'
          ),
          db.raw('0::int as evidences_count'),
          db.raw('NULL::int as latest_case_version'),
          db.raw(
            "(SELECT COUNT(*)::int FROM ai_dispute_evaluations ade WHERE ade.source_type = 'sprint_reverse_review_workflow' AND ade.source_id::text = srw.id::text) as ai_evaluations_count"
          ),
          db.raw(`${latestErrorSql('srw', 'sprint_reverse_review_workflow')} as last_error_message`)
        )
        .orderBy('srw.created_at', direction)
        .orderBy('srw.id', direction)
        .limit(input.limit),
      taskPage
        .select(
          db.raw("'task_review_workflow' as source_type"),
          db.raw("'task_review' as dispute_review_type"),
          'trw.id',
          db.raw('NULL as review_session_id'),
          db.raw('NULL as task_assignment_id'),
          'trw.task_id',
          'trw.organization_id',
          'trw.project_id',
          't.project_sprint_id as sprint_id',
          'trw.reviewee_id',
          'trw.reported_by as opened_by',
          'trw.status',
          db.raw(
            "COALESCE((SELECT trm.body FROM task_review_messages trm WHERE trm.workflow_id = trw.id AND trm.message_type = 'system' ORDER BY trm.created_at DESC LIMIT 1), 'Task review workflow reported') as dispute_reason"
          ),
          db.raw("'request_admin_review' as requested_outcome"),
          'trw.final_decision',
          'trw.final_rationale',
          'trw.created_at',
          'trw.resolved_at',
          't.title as task_title',
          db.raw('NULL as review_session_status'),
          'reviewee.username as reviewee_username',
          db.raw(
            '(SELECT COUNT(*)::int FROM task_review_messages trm WHERE trm.workflow_id = trw.id) as comments_count'
          ),
          db.raw('0::int as evidences_count'),
          db.raw('NULL::int as latest_case_version'),
          db.raw(
            "(SELECT COUNT(*)::int FROM ai_dispute_evaluations ade WHERE ade.source_type = 'task_review_workflow' AND ade.source_id::text = trw.id::text) as ai_evaluations_count"
          ),
          db.raw(`${latestErrorSql('trw', 'task_review_workflow')} as last_error_message`)
        )
        .orderBy('trw.created_at', direction)
        .orderBy('trw.id', direction)
        .limit(input.limit),
    ])

    return {
      rows: sortRows(
        [...classicRows, ...sprintRows, ...reverseRows, ...taskRows] as Record<string, unknown>[],
        direction
      ),
      total,
    }
  }

  async findDisputeDetail(disputeId: string): Promise<ReviewAdminDisputeDetailSnapshot | null> {
    const trx = await db.transaction()
    try {
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

      if (classic) {
        const auditEvents = await this.loadAuditEvents(trx, 'review_dispute', disputeId)
        await trx.commit()
        return {
          sourceType: 'review_dispute',
          dispute: classic,
          comments: [],
          auditEvents,
        }
      }

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

      if (sprint) {
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
        const auditEvents = await this.loadAuditEvents(trx, 'sprint_review_dispute', disputeId)
        await trx.commit()
        return {
          sourceType: 'sprint_review_dispute',
          dispute: sprint,
          comments,
          auditEvents,
        }
      }

      const reverse = (await trx
        .from('sprint_reverse_review_workflows as srw')
        .joinRaw('inner join project_sprints as ps on ps.id::text = srw.sprint_id::text')
        .joinRaw('left join projects as p on p.id::text = srw.project_id::text')
        .joinRaw('left join organizations as org on org.id::text = srw.organization_id::text')
        .joinRaw('left join users as reviewer on reviewer.id::text = srw.reviewer_id::text')
        .where('srw.id', disputeId)
        .whereIn('srw.status', ['reported', 'ai_reviewing', 'resolved'])
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

      if (reverse) {
        const messages = await this.loadWorkflowMessages(
          trx,
          'sprint_reverse_review_messages',
          disputeId
        )
        await trx.commit()
        return {
          sourceType: 'sprint_reverse_review_workflow',
          dispute: reverse,
          comments: messages,
          auditEvents: [],
        }
      }

      const task = (await trx
        .from('task_review_workflows as trw')
        .leftJoin('tasks as t', 't.id', 'trw.task_id')
        .joinRaw('left join project_sprints as ps on ps.id::text = t.project_sprint_id::text')
        .joinRaw('left join projects as p on p.id::text = trw.project_id::text')
        .joinRaw('left join organizations as org on org.id::text = trw.organization_id::text')
        .leftJoin('users as reviewee', 'reviewee.id', 'trw.reviewee_id')
        .where('trw.id', disputeId)
        .whereIn('trw.status', ['reported', 'ai_reviewing', 'resolved'])
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

      if (!task) {
        await trx.commit()
        return null
      }

      const messages = await this.loadWorkflowMessages(trx, 'task_review_messages', disputeId)
      await trx.commit()
      return {
        sourceType: 'task_review_workflow',
        dispute: task,
        comments: messages,
        auditEvents: [],
      }
    } catch (error) {
      await rollbackWithoutMaskingOriginalError(trx, error, {
        module: 'reviews',
        operation: 'read_admin_review_dispute',
      })
      throw error
    }
  }

  private async loadAuditEvents(
    client: ReturnType<typeof db.connection>,
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

  private async loadWorkflowMessages(
    client: ReturnType<typeof db.connection>,
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
}
