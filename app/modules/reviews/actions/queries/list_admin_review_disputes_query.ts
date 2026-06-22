import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ListAdminReviewDisputesDTO {
  page?: number
  per_page?: number
  status?: string | null
  search?: string | null
}

export interface AdminReviewDisputeListItem {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
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
  }
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

function applyFilters(
  query: ReturnType<typeof db.query>,
  dto: ListAdminReviewDisputesDTO
) {
  if (dto.status && dto.status.trim().length > 0) {
    void query.where('rd.status', dto.status.trim())
  }

  if (dto.search && dto.search.trim().length > 0) {
    const needle = dto.search.trim()
    const term = `%${needle}%`
    void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ? OR rd.reviewee_id = ?)', [
      term,
      term,
      needle,
    ])
  }

  return query
}

export default class ListAdminReviewDisputesQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListAdminReviewDisputesDTO): Promise<ListAdminReviewDisputesResult> {
    const actorId = requireUserId(this.execCtx)
    await requireSystemAdmin(actorId)

    const page = Math.max(1, Math.trunc(dto.page ?? 1))
    const perPage = Math.max(1, Math.min(100, Math.trunc(dto.per_page ?? 20)))
    const offset = (page - 1) * perPage

    const baseQuery = applyFilters(
      db
        .from('review_disputes as rd')
        .leftJoin('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id'),
      dto
    )

    const totalRow = (await baseQuery
      .clone()
      .clearSelect()
      .countDistinct('rd.id as total')
      .first()) as { total?: number | string } | undefined
    const total = Number(totalRow?.total ?? 0)

    const rows = (await baseQuery
      .clone()
      .select(
        'rd.*',
        't.title as task_title',
        'rs.status as review_session_status',
        'reviewee.username as reviewee_username',
        db.raw(
          "(SELECT COUNT(*)::int FROM review_dispute_comments rdc WHERE rdc.dispute_id = rd.id AND rdc.deleted_at IS NULL) as comments_count"
        ),
        db.raw(
          "(SELECT COUNT(*)::int FROM review_dispute_evidences rde WHERE rde.dispute_id = rd.id) as evidences_count"
        ),
        db.raw(
          "(SELECT MAX(rdcf.case_version)::int FROM review_dispute_case_files rdcf WHERE rdcf.dispute_id = rd.id) as latest_case_version"
        ),
        db.raw(
          "(SELECT COUNT(*)::int FROM ai_dispute_evaluations ade WHERE ade.dispute_id = rd.id) as ai_evaluations_count"
        )
      )
      .orderBy('rd.created_at', 'desc')
      .orderBy('rd.id', 'desc')
      .offset(offset)
      .limit(perPage)) as Record<string, unknown>[]

    return {
      data: rows.map((row) => ({
        id: row.id as string,
        review_session_id: row.review_session_id as string,
        task_assignment_id: row.task_assignment_id as string,
        task_id: row.task_id as string,
        reviewee_id: row.reviewee_id as string,
        opened_by: row.opened_by as string,
        status: row.status as string,
        dispute_reason: row.dispute_reason as string,
        requested_outcome: row.requested_outcome as string,
        final_decision: (row.final_decision as string | null) ?? null,
        final_rationale: (row.final_rationale as string | null) ?? null,
        created_at: String(row.created_at),
        resolved_at: (row.resolved_at as string | null) ?? null,
        task_title: (row.task_title as string | null) ?? null,
        reviewee_username: (row.reviewee_username as string | null) ?? null,
        review_session_status: (row.review_session_status as string | null) ?? null,
        comments_count: Number(row.comments_count ?? 0),
        evidences_count: Number(row.evidences_count ?? 0),
        latest_case_version:
          row.latest_case_version === null || row.latest_case_version === undefined
            ? null
            : Number(row.latest_case_version),
        ai_evaluations_count: Number(row.ai_evaluations_count ?? 0),
      })),
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  }
}
