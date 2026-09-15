import db from '@adonisjs/lucid/services/db'

import {
  loadClassicDisputeDetail,
  loadReverseDisputeDetail,
  loadSprintDisputeDetail,
  loadTaskWorkflowDisputeDetail,
} from './lucid_review_admin_dispute_detail_queries.js'
import {
  applyClassicFilters,
  applyCursorWindow,
  applyReverseWorkflowFilters,
  applySprintFilters,
  applyTaskWorkflowFilters,
  latestErrorSql,
  sortRows,
} from './lucid_review_admin_dispute_query_builders.js'

import { rollbackWithoutMaskingOriginalError } from '#modules/logger/public_contracts/transaction_rollback'
import type {
  ReviewAdminDisputeDetailSnapshot,
  ReviewAdminDisputeListReadInput,
  ReviewAdminDisputeListSnapshot,
  ReviewAdminDisputeReadModel,
} from '#modules/disputes/actions/ports/outbound/review_admin_dispute_read_model'


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
      const classic = await loadClassicDisputeDetail(trx, disputeId)
      if (classic) {
        await trx.commit()
        return classic
      }

      const sprint = await loadSprintDisputeDetail(trx, disputeId)
      if (sprint) {
        await trx.commit()
        return sprint
      }

      const reverse = await loadReverseDisputeDetail(trx, disputeId)
      if (reverse) {
        await trx.commit()
        return reverse
      }

      const task = await loadTaskWorkflowDisputeDetail(trx, disputeId)
      if (task) {
        await trx.commit()
        return task
      }

      await trx.commit()
      return null
    } catch (error) {
      await rollbackWithoutMaskingOriginalError(trx, error, {
        module: 'reviews',
        operation: 'read_admin_review_dispute',
      })
      throw error
    }
  }
}
