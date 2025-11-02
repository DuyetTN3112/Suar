import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

export interface ListOrgReviewDisputesDTO {
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
  status?: string | null
  search?: string | null
  createdAtStart?: string | null
  createdAtEnd?: string | null
}

export interface OrgReviewDisputeListItem {
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
}

export interface ListOrgReviewDisputesResult {
  data: OrgReviewDisputeListItem[]
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

function requireOrganizationId(ctx: ReviewActionContext): string {
  if (!ctx.organizationId) {
    throw new ForbiddenException('Organization context is required to list disputes')
  }
  return ctx.organizationId
}

function applyFilters(
  query: ReturnType<typeof db.query>,
  dto: ListOrgReviewDisputesDTO
) {
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

  if (dto.createdAtStart) {
    void query.where('rd.created_at', '>=', dto.createdAtStart)
  }
  if (dto.createdAtEnd) {
    void query.where('rd.created_at', '<=', dto.createdAtEnd)
  }

  return query
}

export default class ListOrgReviewDisputesQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListOrgReviewDisputesDTO): Promise<ListOrgReviewDisputesResult> {
    const actorId = requireUserId(this.execCtx)
    const orgId = requireOrganizationId(this.execCtx)

    // Verify member has access to organization
    const isMember = await organizationPublicApi.isApprovedMember(actorId, orgId)
    if (!isMember) {
      throw new ForbiddenException('User is not an approved member of this organization')
    }

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

    const baseQuery = applyFilters(
      db
        .from('review_disputes as rd')
        .join('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id')
        .where('t.organization_id', orgId),
      dto
    )

    const totalRow = (await baseQuery
      .clone()
      .clearSelect()
      .countDistinct('rd.id as total')
      .first()) as { total?: number | string } | undefined
    const total = Number(totalRow?.total ?? 0)

    const pageQuery = baseQuery.clone()

    if (decodedCursor) {
      void pageQuery.where((builder) => {
        void builder
          .where('rd.created_at', '<', decodedCursor.createdAt)
          .orWhere((nested) => {
            void nested.where('rd.created_at', decodedCursor.createdAt).where('rd.id', '<', decodedCursor.id)
          })
      })
    } else if (decodedBeforeCursor) {
      void pageQuery.where((builder) => {
        void builder
          .where('rd.created_at', '>', decodedBeforeCursor.createdAt)
          .orWhere((nested) => {
            void nested.where('rd.created_at', decodedBeforeCursor.createdAt).where('rd.id', '>', decodedBeforeCursor.id)
          })
      })
    }

    const rows = (await pageQuery
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
        )
      )
      .orderBy('rd.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('rd.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)) as Record<string, unknown>[]
    const hasOverflow = rows.length > pagination.perPage
    const windowRows = hasOverflow ? rows.slice(0, pagination.perPage) : rows
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
        review_session_id: row['review_session_id'] as string,
        task_assignment_id: row['task_assignment_id'] as string,
        task_id: row['task_id'] as string,
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
