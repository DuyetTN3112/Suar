import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

export interface ListAdminReviewDisputesDTO {
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
  status?: string | null
  search?: string | null
  requestedOutcome?: string | null
  finalDecision?: string | null
}

export interface AdminReviewDisputeListItem {
  id: string
  source_type:
    | 'review_dispute'
    | 'sprint_review_dispute'
    | 'sprint_reverse_review_workflow'
    | 'task_review_workflow'
  dispute_review_type: 'task_review' | 'manager_review' | 'environment_review'
  review_session_id: string | null
  task_assignment_id: string | null
  task_id: string | null
  organization_id: string | null
  project_id: string | null
  sprint_id: string | null
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  final_decision: string | null
  final_rationale: string | null
  created_at: string
  resolved_at: string | null
  task_title: string | null
  reviewee_username: string | null
  review_session_status: string | null
  comments_count: number
  evidences_count: number
  latest_case_version: number | null
  ai_evaluations_count: number
}

export interface ListAdminReviewDisputesResult {
  data: AdminReviewDisputeListItem[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

async function requireSystemAdmin(actorId: string): Promise<void> {
  const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
    | { system_role?: string }
    | undefined

  if (!actor) {
    throw new NotFoundException('User not found')
  }

  if (actor.system_role !== 'system_admin' && actor.system_role !== 'superadmin') {
    throw new ForbiddenException('Only system admin can view review disputes')
  }
}

function applyFilters(query: ReturnType<typeof db.query>, dto: ListAdminReviewDisputesDTO) {
  if (dto.status && dto.status.trim().length > 0) {
    void query.where('rd.status', dto.status.trim())
  }

  if (dto.search && dto.search.trim().length > 0) {
    const needle = dto.search.trim()
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

  if (dto.requestedOutcome && dto.requestedOutcome.trim().length > 0) {
    void query.where('rd.requested_outcome', dto.requestedOutcome.trim())
  }

  if (dto.finalDecision && dto.finalDecision.trim().length > 0) {
    void query.where('rd.final_decision', dto.finalDecision.trim())
  }

  return query
}

function applySprintFilters(query: ReturnType<typeof db.query>, dto: ListAdminReviewDisputesDTO) {
  if (dto.status && dto.status.trim().length > 0) {
    void query.where('srd.status', dto.status.trim())
  }

  if (dto.search && dto.search.trim().length > 0) {
    const needle = dto.search.trim()
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

  if (dto.requestedOutcome && dto.requestedOutcome.trim().length > 0) {
    void query.where('srd.requested_outcome', dto.requestedOutcome.trim())
  }

  if (dto.finalDecision && dto.finalDecision.trim().length > 0) {
    void query.where('srd.final_decision', dto.finalDecision.trim())
  }

  return query
}

function applyReverseWorkflowFilters(
  query: ReturnType<typeof db.query>,
  dto: ListAdminReviewDisputesDTO
) {
  if (dto.status && dto.status.trim().length > 0) {
    void query.where('srw.status', dto.status.trim())
  } else {
    void query.whereIn('srw.status', ['reported', 'ai_reviewing', 'resolved'])
  }

  if (dto.search && dto.search.trim().length > 0) {
    const needle = dto.search.trim()
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

  if (dto.requestedOutcome && dto.requestedOutcome.trim().length > 0) {
    void query.whereRaw('1 = 0')
  }

  if (dto.finalDecision && dto.finalDecision.trim().length > 0) {
    void query.where('srw.final_decision', dto.finalDecision.trim())
  }

  return query
}

function applyTaskReviewWorkflowFilters(
  query: ReturnType<typeof db.query>,
  dto: ListAdminReviewDisputesDTO
) {
  if (dto.status && dto.status.trim().length > 0) {
    void query.where('trw.status', dto.status.trim())
  } else {
    void query.whereIn('trw.status', ['reported', 'ai_reviewing', 'resolved'])
  }

  if (dto.search && dto.search.trim().length > 0) {
    const needle = dto.search.trim()
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

  if (dto.requestedOutcome && dto.requestedOutcome.trim().length > 0) {
    if (dto.requestedOutcome.trim() !== 'request_admin_review') {
      void query.whereRaw('1 = 0')
    }
  }

  if (dto.finalDecision && dto.finalDecision.trim().length > 0) {
    void query.where('trw.final_decision', dto.finalDecision.trim())
  }

  return query
}

function applyCursorWindow(
  query: ReturnType<typeof db.query>,
  alias: string,
  decodedCursor: ReturnType<typeof decodeTimestampCursor>,
  decodedBeforeCursor: ReturnType<typeof decodeTimestampCursor>
) {
  if (decodedCursor) {
    void query.where((builder) => {
      void builder.where(`${alias}.created_at`, '<', decodedCursor.createdAt).orWhere((nested) => {
        void nested
          .where(`${alias}.created_at`, decodedCursor.createdAt)
          .where(`${alias}.id`, '<', decodedCursor.id)
      })
    })
  } else if (decodedBeforeCursor) {
    void query.where((builder) => {
      void builder
        .where(`${alias}.created_at`, '>', decodedBeforeCursor.createdAt)
        .orWhere((nested) => {
          void nested
            .where(`${alias}.created_at`, decodedBeforeCursor.createdAt)
            .where(`${alias}.id`, '>', decodedBeforeCursor.id)
        })
    })
  }

  return query
}

function sortDisputeRows(
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

export default class ListAdminReviewDisputesQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListAdminReviewDisputesDTO): Promise<ListAdminReviewDisputesResult> {
    const actorId = requireUserId(this.execCtx)
    await requireSystemAdmin(actorId)

    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.perPage,
      },
      REVIEW_PAGINATION
    )
    const decodedCursor = decodeTimestampCursor(dto.after ?? null)
    const decodedBeforeCursor = decodeTimestampCursor(dto.before ?? null)
    const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

    const classicBaseQuery = applyFilters(
      db
        .from('review_disputes as rd')
        .leftJoin('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id'),
      dto
    )
    void classicBaseQuery.whereNotNull('rd.reported_to_admin_at')
    const sprintBaseQuery = applySprintFilters(
      db
        .from('sprint_review_disputes as srd')
        .joinRaw('inner join sprint_review_packages as srp on srp.id::text = srd.package_id')
        .joinRaw('inner join project_sprints as ps on ps.id::text = srp.sprint_id')
        .joinRaw('left join users as reviewer on reviewer.id::text = srp.reviewer_id'),
      dto
    )
    void sprintBaseQuery.whereNotNull('srd.reported_to_admin_at')
    const reverseWorkflowBaseQuery = applyReverseWorkflowFilters(
      db
        .from('sprint_reverse_review_workflows as srw')
        .joinRaw('inner join project_sprints as ps on ps.id::text = srw.sprint_id::text')
        .joinRaw('left join users as reviewer on reviewer.id::text = srw.reviewer_id::text'),
      dto
    )
    const taskReviewWorkflowBaseQuery = applyTaskReviewWorkflowFilters(
      db
        .from('task_review_workflows as trw')
        .leftJoin('tasks as t', 't.id', 'trw.task_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'trw.reviewee_id'),
      dto
    )

    const classicTotalRow = (await classicBaseQuery
      .clone()
      .clearSelect()
      .countDistinct('rd.id as total')
      .first()) as { total?: number | string } | undefined
    const sprintTotalRow = (await sprintBaseQuery
      .clone()
      .clearSelect()
      .countDistinct('srd.id as total')
      .first()) as { total?: number | string } | undefined
    const reverseWorkflowTotalRow = (await reverseWorkflowBaseQuery
      .clone()
      .clearSelect()
      .countDistinct('srw.id as total')
      .first()) as { total?: number | string } | undefined
    const taskReviewWorkflowTotalRow = (await taskReviewWorkflowBaseQuery
      .clone()
      .clearSelect()
      .countDistinct('trw.id as total')
      .first()) as { total?: number | string } | undefined
    const total =
      Number(classicTotalRow?.total ?? 0) +
      Number(sprintTotalRow?.total ?? 0) +
      Number(reverseWorkflowTotalRow?.total ?? 0) +
      Number(taskReviewWorkflowTotalRow?.total ?? 0)

    const classicPageQuery = applyCursorWindow(
      classicBaseQuery.clone(),
      'rd',
      decodedCursor,
      decodedBeforeCursor
    )
    const sprintPageQuery = applyCursorWindow(
      sprintBaseQuery.clone(),
      'srd',
      decodedCursor,
      decodedBeforeCursor
    )
    const reverseWorkflowPageQuery = applyCursorWindow(
      reverseWorkflowBaseQuery.clone(),
      'srw',
      decodedCursor,
      decodedBeforeCursor
    )
    const taskReviewWorkflowPageQuery = applyCursorWindow(
      taskReviewWorkflowBaseQuery.clone(),
      'trw',
      decodedCursor,
      decodedBeforeCursor
    )

    const classicRows = (await classicPageQuery
      .clone()
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
        )
      )
      .orderBy('rd.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('rd.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)) as Record<string, unknown>[]
    const sprintRows = (await sprintPageQuery
      .clone()
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
        )
      )
      .orderBy('srd.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('srd.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)) as Record<string, unknown>[]
    const reverseWorkflowRows = (await reverseWorkflowPageQuery
      .clone()
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
        )
      )
      .orderBy('srw.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('srw.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)) as Record<string, unknown>[]
    const taskReviewWorkflowRows = (await taskReviewWorkflowPageQuery
      .clone()
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
        )
      )
      .orderBy('trw.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('trw.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)) as Record<string, unknown>[]
    const rows = sortDisputeRows(
      [...classicRows, ...sprintRows, ...reverseWorkflowRows, ...taskReviewWorkflowRows],
      isBeforeWindow ? 'asc' : 'desc'
    )
    const hasOverflow = rows.length > pagination.perPage
    const windowRows = rows.slice(0, pagination.perPage)
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]
    const meta = buildPaginationMeta(total, {
      ...pagination,
      page: decodedCursor || decodedBeforeCursor ? 1 : pagination.page,
    })

    return {
      data: pageRows.map((row) => ({
        id: row['id'] as string,
        source_type: row['source_type'] as
          | 'review_dispute'
          | 'sprint_review_dispute'
          | 'sprint_reverse_review_workflow'
          | 'task_review_workflow',
        dispute_review_type: row['dispute_review_type'] as
          | 'task_review'
          | 'manager_review'
          | 'environment_review',
        review_session_id: (row['review_session_id'] as string | null) ?? null,
        task_assignment_id: (row['task_assignment_id'] as string | null) ?? null,
        task_id: (row['task_id'] as string | null) ?? null,
        organization_id: (row['organization_id'] as string | null) ?? null,
        project_id: (row['project_id'] as string | null) ?? null,
        sprint_id: (row['sprint_id'] as string | null) ?? null,
        reviewee_id: row['reviewee_id'] as string,
        opened_by: row['opened_by'] as string,
        status: row['status'] as string,
        dispute_reason: row['dispute_reason'] as string,
        requested_outcome: row['requested_outcome'] as string,
        final_decision: (row['final_decision'] as string | null) ?? null,
        final_rationale: (row['final_rationale'] as string | null) ?? null,
        created_at: String(row['created_at']),
        resolved_at: (row['resolved_at'] as string | null) ?? null,
        task_title: (row['task_title'] as string | null) ?? null,
        reviewee_username: (row['reviewee_username'] as string | null) ?? null,
        review_session_status: (row['review_session_status'] as string | null) ?? null,
        comments_count: Number(row['comments_count'] ?? 0),
        evidences_count: Number(row['evidences_count'] ?? 0),
        latest_case_version:
          row['latest_case_version'] === null || row['latest_case_version'] === undefined
            ? null
            : Number(row['latest_case_version']),
        ai_evaluations_count: Number(row['ai_evaluations_count'] ?? 0),
      })),
      meta: {
        total: meta.total,
        per_page: meta.perPage,
        current_page: meta.currentPage,
        last_page: meta.lastPage,
        cursor: {
          next_cursor:
            (isBeforeWindow || hasOverflow) && lastRow
              ? encodeTimestampCursor({
                  createdAt: new Date(lastRow['created_at'] as string | Date).toISOString(),
                  id: lastRow['id'] as string,
                })
              : null,
          previous_cursor:
            (decodedCursor || isBeforeWindow) && firstRow
              ? encodeTimestampCursor({
                  createdAt: new Date(firstRow['created_at'] as string | Date).toISOString(),
                  id: firstRow['id'] as string,
                })
              : null,
          has_next_page: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
          has_previous_page: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
        },
      },
    }
  }
}
