import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type ReverseReviewReadScope = 'me' | 'org' | 'admin'

export interface ListReverseReviewsDTO {
  scope: ReverseReviewReadScope
}

export interface ReverseReviewReadResult {
  id: string
  review_session_id: string
  reviewer_id: string | null
  target_type: string
  target_id: string
  rating: number
  comment: string | null
  is_anonymous: boolean
  created_at: unknown
}

interface ReverseReviewRow {
  id: string
  review_session_id: string
  reviewer_id: string
  target_type: string
  target_id: string
  rating: number
  comment: string | null
  is_anonymous: boolean
  created_at: unknown
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function normalize(row: ReverseReviewRow, hideAnonymousIdentity: boolean): ReverseReviewReadResult {
  return {
    id: row.id,
    review_session_id: row.review_session_id,
    reviewer_id: hideAnonymousIdentity && row.is_anonymous ? null : row.reviewer_id,
    target_type: row.target_type,
    target_id: row.target_id,
    rating: row.rating,
    comment: row.comment,
    is_anonymous: row.is_anonymous,
    created_at: row.created_at,
  }
}

const ORG_REVERSE_REVIEW_ALLOWED_ROLES = new Set(['org_owner', 'org_admin', 'org_manager'])

export default class ListReverseReviewsQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListReverseReviewsDTO): Promise<ReverseReviewReadResult[]> {
    const actorId = requireUserId(this.execCtx)

    if (dto.scope === 'me') {
      const rows = (await db
        .from('reverse_reviews')
        .where('reviewer_id', actorId)
        .orderBy('created_at', 'desc')
        .select('*')) as ReverseReviewRow[]

      return rows.map((row) => normalize(row, false))
    }

    if (dto.scope === 'admin') {
      const actor = (await db
        .from('users')
        .where('id', actorId)
        .select('system_role')
        .first()) as { system_role?: string } | undefined

      if (actor?.system_role !== 'system_admin' && actor?.system_role !== 'superadmin') {
        throw new ForbiddenException('Only system admin can inspect reverse reviews')
      }

      const rows = (await db
        .from('reverse_reviews')
        .orderBy('created_at', 'desc')
        .select('*')) as ReverseReviewRow[]

      return rows.map((row) => normalize(row, false))
    }

    if (!this.execCtx.organizationId) {
      throw new ForbiddenException('Organization context is required to list reverse reviews')
    }

    const membership = (await db
      .from('organization_users')
      .where('organization_id', this.execCtx.organizationId)
      .where('user_id', actorId)
      .whereIn('org_role', [...ORG_REVERSE_REVIEW_ALLOWED_ROLES])
      .where('status', 'approved')
      .select('org_role')
      .first()) as { org_role?: string } | undefined

    if (!membership) {
      throw new ForbiddenException(
        'Only org owners, admins, or managers can list organization reverse reviews'
      )
    }

    const rows = (await db
      .from('reverse_reviews')
      .join('review_sessions', 'review_sessions.id', 'reverse_reviews.review_session_id')
      .join('task_assignments', 'task_assignments.id', 'review_sessions.task_assignment_id')
      .join('tasks', 'tasks.id', 'task_assignments.task_id')
      .where('tasks.organization_id', this.execCtx.organizationId)
      .orderBy('reverse_reviews.created_at', 'desc')
      .select('reverse_reviews.*')) as ReverseReviewRow[]

    return rows.map((row) => normalize(row, true))
  }
}
