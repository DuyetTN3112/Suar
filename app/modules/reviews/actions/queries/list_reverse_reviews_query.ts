import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

export type ReverseReviewReadScope = 'me' | 'org' | 'admin'

export interface ListReverseReviewsDTO {
  scope: ReverseReviewReadScope
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
}

export interface ReverseReviewReadResult {
  id: string
  review_session_id: string
  reviewer_id: string | null
  reviewer_username?: string | null
  target_type: string
  target_id: string
  target_label?: string | null
  rating: number
  comment: string | null
  is_anonymous: boolean
  created_at: unknown
}

export interface ReverseReviewPaginationResult {
  data: ReverseReviewReadResult[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor?: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
  }
  stats: {
    total: number
    anonymous: number
    by_target_type: Record<string, number>
  }
}

interface ReverseReviewRow {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_username?: string | null
  target_type: string
  target_id: string
  target_user_username?: string | null
  target_project_name?: string | null
  target_organization_name?: string | null
  rating: number
  comment: string | null
  is_anonymous: boolean
  created_at: unknown
}

interface CountRow {
  total?: number | string
}

interface TargetTypeCountRow {
  target_type: string
  total: number | string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function normalize(row: ReverseReviewRow, hideAnonymousIdentity: boolean): ReverseReviewReadResult {
  const targetLabel =
    row.target_type === 'project'
      ? row.target_project_name ?? row.target_id
      : row.target_type === 'organization'
        ? row.target_organization_name ?? row.target_id
        : row.target_user_username ?? row.target_id

  return {
    id: row.id,
    review_session_id: row.review_session_id,
    reviewer_id: hideAnonymousIdentity && row.is_anonymous ? null : row.reviewer_id,
    reviewer_username: hideAnonymousIdentity && row.is_anonymous ? null : (row.reviewer_username ?? null),
    target_type: row.target_type,
    target_id: row.target_id,
    target_label: targetLabel,
    rating: row.rating,
    comment: row.comment,
    is_anonymous: row.is_anonymous,
    created_at: row.created_at,
  }
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const ORG_REVERSE_REVIEW_ALLOWED_ROLES = new Set([
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
  'org_manager',
])

export default class ListReverseReviewsQuery {
  constructor(private execCtx: ReviewActionContext) {}

  private buildScopedBaseQuery() {
    return db
      .from('reverse_reviews')
      .leftJoin('users as reviewer', 'reviewer.id', 'reverse_reviews.reviewer_id')
      .leftJoin('users as target_user', 'target_user.id', 'reverse_reviews.target_id')
      .leftJoin('projects as target_project', 'target_project.id', 'reverse_reviews.target_id')
      .leftJoin('organizations as target_organization', 'target_organization.id', 'reverse_reviews.target_id')
  }

  async execute(dto: ListReverseReviewsDTO): Promise<ReverseReviewPaginationResult> {
    const actorId = requireUserId(this.execCtx)
    const pagination = normalizePagination(dto, REVIEW_PAGINATION)

    if (dto.scope === 'me') {
      const baseQuery = this.buildScopedBaseQuery()
        .where('reviewer_id', actorId)
      return this.paginateScopedReviews(baseQuery, pagination, dto, false)
    }

    if (dto.scope === 'admin') {
      const actor = (await db
        .from('users')
        .where('id', actorId)
        .select('system_role')
        .first()) as { system_role?: string } | undefined

      if (
        actor?.system_role !== SystemRoleName.SYSTEM_ADMIN &&
        actor?.system_role !== SystemRoleName.SUPERADMIN
      ) {
        throw new ForbiddenException('Only system admin can inspect review môi trường')
      }

      const baseQuery = this.buildScopedBaseQuery()
      return this.paginateScopedReviews(baseQuery, pagination, dto, false)
    }

    if (!this.execCtx.organizationId) {
      throw new ForbiddenException('Organization context is required to list review môi trường')
    }

    const membership = (await db
      .from('organization_users')
      .where('organization_id', this.execCtx.organizationId)
      .where('user_id', actorId)
      .whereIn('org_role', [...ORG_REVERSE_REVIEW_ALLOWED_ROLES])
      .where('status', OrganizationUserStatus.APPROVED)
      .select('org_role')
      .first()) as { org_role?: string } | undefined

    if (!membership) {
      throw new ForbiddenException(
        'Only org owners, admins, or managers can list organization review môi trường'
      )
    }

    const baseQuery = this.buildScopedBaseQuery()
      .join('review_sessions', 'review_sessions.id', 'reverse_reviews.review_session_id')
      .join('task_assignments', 'task_assignments.id', 'review_sessions.task_assignment_id')
      .join('tasks', 'tasks.id', 'task_assignments.task_id')
      .where('tasks.organization_id', this.execCtx.organizationId)
    return this.paginateScopedReviews(baseQuery, pagination, dto, true)
  }

  private async paginateScopedReviews(
    scopedQuery: ReturnType<typeof db.from>,
    pagination: { page: number; perPage: number },
    dto: Pick<ListReverseReviewsDTO, 'after' | 'before'>,
    hideAnonymousIdentity: boolean
  ): Promise<ReverseReviewPaginationResult> {
    const decodedCursor = decodeTimestampCursor(dto.after ?? null)
    const decodedBeforeCursor = decodeTimestampCursor(dto.before ?? null)
    const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)
    const countQuery = scopedQuery.clone().clearSelect().clearOrder().count('* as total')
    const anonymousQuery = scopedQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .where('reverse_reviews.is_anonymous', true)
      .count('* as total')
    const targetTypeQuery = scopedQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .select('reverse_reviews.target_type')
      .count('* as total')
      .groupBy('reverse_reviews.target_type')
    const rowsQuery = scopedQuery
      .clone()
      .select(
        'reverse_reviews.*',
        'reviewer.username as reviewer_username',
        'target_user.username as target_user_username',
        'target_project.name as target_project_name',
        'target_organization.name as target_organization_name'
      )
    if (decodedCursor) {
      void rowsQuery.where((builder) => {
        void builder
          .where('reverse_reviews.created_at', '<', decodedCursor.createdAt)
          .orWhere((nested) => {
            void nested
              .where('reverse_reviews.created_at', decodedCursor.createdAt)
              .where('reverse_reviews.id', '<', decodedCursor.id)
          })
      })
    } else if (decodedBeforeCursor) {
      void rowsQuery.where((builder) => {
        void builder
          .where('reverse_reviews.created_at', '>', decodedBeforeCursor.createdAt)
          .orWhere((nested) => {
            void nested
              .where('reverse_reviews.created_at', decodedBeforeCursor.createdAt)
              .where('reverse_reviews.id', '>', decodedBeforeCursor.id)
          })
      })
    }
    void rowsQuery
      .orderBy('reverse_reviews.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('reverse_reviews.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(pagination.perPage + 1)

    const [countRowRaw, anonymousRowRaw, targetTypeRowsRaw, rowsRaw] = (await Promise.all([
      countQuery.first(),
      anonymousQuery.first(),
      targetTypeQuery,
      rowsQuery,
    ])) as [CountRow | null, CountRow | null, TargetTypeCountRow[], ReverseReviewRow[]]

    const total = toNumberValue(countRowRaw?.total)
    const hasOverflow = rowsRaw.length > pagination.perPage
    const windowRows = hasOverflow ? rowsRaw.slice(0, pagination.perPage) : rowsRaw
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]
    const meta = buildPaginationMeta(total, {
      ...pagination,
      page: decodedCursor || decodedBeforeCursor ? 1 : pagination.page,
    })
    const byTargetType = (Array.isArray(targetTypeRowsRaw) ? targetTypeRowsRaw : []).reduce<Record<string, number>>(
      (accumulator, row) => {
        accumulator[row.target_type] = toNumberValue(row.total)
        return accumulator
      },
      {}
    )

    return {
      data: pageRows.map((row) => normalize(row, hideAnonymousIdentity)),
      meta: {
        total: meta.total,
        per_page: meta.perPage,
        current_page: meta.currentPage,
        last_page: meta.lastPage,
        cursor: {
          next_cursor:
            (isBeforeWindow || hasOverflow) && lastRow
              ? encodeTimestampCursor({
                  createdAt: new Date(String(lastRow.created_at)).toISOString(),
                  id: lastRow.id,
                })
              : null,
          previous_cursor:
            (decodedCursor || isBeforeWindow) && firstRow
              ? encodeTimestampCursor({
                  createdAt: new Date(String(firstRow.created_at)).toISOString(),
                  id: firstRow.id,
                })
              : null,
          has_next_page: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
          has_previous_page: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
        },
      },
      stats: {
        total,
        anonymous: toNumberValue(anonymousRowRaw?.total),
        by_target_type: byTargetType,
      },
    }
  }
}
