import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewOrganizationReader } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewOrgDisputeReader } from '#modules/reviews/actions/ports/outbound/review_org_dispute_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

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

export default class ListOrgReviewDisputesQuery {
  constructor(
    private execCtx: ReviewActionContext,
    private readonly organizationReader: ReviewOrganizationReader,
    private readonly disputes: ReviewOrgDisputeReader
  ) {}

  async execute(dto: ListOrgReviewDisputesDTO): Promise<ListOrgReviewDisputesResult> {
    const actorId = requireUserId(this.execCtx)
    const orgId = requireOrganizationId(this.execCtx)

    // Verify member has access to organization
    const isMember = await this.organizationReader.isApprovedMember(actorId, orgId)
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

    const searchTerm = dto.search?.trim() || null
    const window = await this.disputes.readWindow({
      organizationId: orgId,
      status: dto.status?.trim() || null,
      searchTerm,
      revieweeId: searchTerm && isUuidLike(searchTerm) ? searchTerm : null,
      createdAtStart: dto.createdAtStart ?? null,
      createdAtEnd: dto.createdAtEnd ?? null,
      after: decodedCursor,
      before: decodedBeforeCursor,
      limit: pagination.perPage,
    })
    const rows = window.rows
    const hasOverflow = rows.length > pagination.perPage
    const windowRows = hasOverflow ? rows.slice(0, pagination.perPage) : rows
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]
    const meta = buildPaginationMeta(window.total, {
      ...pagination,
      page: decodedCursor || decodedBeforeCursor ? 1 : pagination.page,
    })

    return {
      data: pageRows.map((row) => ({
        id: row.id,
        review_session_id: row.review_session_id,
        task_assignment_id: row.task_assignment_id,
        task_id: row.task_id,
        reviewee_id: row.reviewee_id,
        opened_by: row.opened_by,
        status: row.status,
        dispute_reason: row.dispute_reason,
        requested_outcome: row.requested_outcome,
        final_decision: row.final_decision ?? null,
        final_rationale: row.final_rationale ?? null,
        created_at: String(row.created_at),
        resolved_at: row.resolved_at ?? null,
        task_title: row.task_title ?? null,
        reviewee_username: row.reviewee_username ?? null,
        review_session_status: row.review_session_status ?? null,
        comments_count: Number(row.comments_count),
        evidences_count: Number(row.evidences_count),
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
                  createdAt: new Date(lastRow.created_at).toISOString(),
                  id: lastRow.id,
                })
              : null,
          previous_cursor:
            (decodedCursor || isBeforeWindow) && firstRow
              ? encodeTimestampCursor({
                  createdAt: new Date(firstRow.created_at).toISOString(),
                  id: firstRow.id,
                })
              : null,
          has_next_page: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
          has_previous_page: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
        },
      },
    }
  }
}
