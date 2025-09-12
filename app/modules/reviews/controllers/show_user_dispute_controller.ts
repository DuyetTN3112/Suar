import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/reviews/actions/commands/review_dispute_access'

interface ReviewDisputeDetailRow {
  id: string
  task_id: string
  review_session_id: string
  reviewee_id: string
  disputed_dimensions: string | Record<string, unknown> | null
  disputed_skill_reviews: string | Record<string, unknown>[] | null
  task_title: string | null
  task_description: string | null
  organization_id: string | null
  project_id: string | null
  review_session_status: string | null
  reviewee_username: string | null
  reviewee_email: string | null
  [key: string]: unknown
}

function parseJsonObject(value: string | Record<string, unknown> | null): Record<string, unknown> {
  if (!value) {
    return {}
  }

  return typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value
}

function parseJsonArray(
  value: string | Record<string, unknown>[] | null
): Record<string, unknown>[] {
  if (!value) {
    return []
  }

  return typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>[]) : value
}

export default class ShowUserDisputeController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth } = ctx
    const actorId = auth.user?.id

    if (!actorId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // 1) Verify access context
      const accessCtx = await loadReviewDisputeAccessContext(trx, params.id as string, actorId)
      if (!accessCtx.isParticipant) {
        throw new ForbiddenException('You do not have access to this review dispute')
      }

      // 2) Load dispute detail with joined names
      const dispute = await trx
        .from('review_disputes as rd')
        .leftJoin('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id')
        .where('rd.id', params.id as string)
        .select(
          'rd.*',
          't.title as task_title',
          't.description as task_description',
          't.organization_id',
          't.project_id',
          'rs.status as review_session_status',
          'reviewee.username as reviewee_username',
          'reviewee.email as reviewee_email'
        )
        .first() as ReviewDisputeDetailRow | null

      if (!dispute) {
        throw new NotFoundException('Dispute not found')
      }

      const parsedDispute = {
        ...dispute,
        disputed_dimensions: parseJsonObject(dispute.disputed_dimensions),
        disputed_skill_reviews: parseJsonArray(dispute.disputed_skill_reviews),
      }

      const comments = await loadReviewDisputeComments(trx, params.id as string)
      const evidences = await loadReviewDisputeEvidences(trx, params.id as string)

      await trx.commit()

      return await inertia.render('reviews/disputes/show', {
        dispute: parsedDispute,
        comments,
        evidences,
        authorContext: accessCtx.authorContext,
        canRespond: accessCtx.canRespond,
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
