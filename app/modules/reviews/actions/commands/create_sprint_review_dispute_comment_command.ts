import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadSprintReviewDisputeAccessContext,
  type SprintReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/sprint_review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface CreateSprintReviewDisputeCommentDTO {
  dispute_id: string
  body: string
  visibility?: 'all_parties' | 'admin_only'
}

export interface SprintReviewDisputeCommentResult {
  id: string
  dispute_id: string
  author_id: string
  author_context: SprintReviewDisputeAuthorContext
  body: string
  visibility: string
  created_at: string
}

const CLOSED_STATUSES = new Set(['resolved', 'rejected', 'cancelled'])

export default class CreateSprintReviewDisputeCommentCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: CreateSprintReviewDisputeCommentDTO): Promise<SprintReviewDisputeCommentResult> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      const access = await loadSprintReviewDisputeAccessContext(trx, dto.dispute_id, actorId)
      if (!access.isParticipant || !access.authorContext) {
        throw new ForbiddenException('Sprint review dispute participant context is required')
      }
      if (CLOSED_STATUSES.has(access.dispute.status)) {
        throw new BusinessLogicException('Sprint review dispute is closed')
      }
      if (dto.body.trim().length === 0) {
        throw new BusinessLogicException('Sprint review dispute comment body is required')
      }

      const [created] = (await trx
        .table('sprint_review_dispute_comments')
        .insert({
          id: randomUUID(),
          dispute_id: dto.dispute_id,
          author_id: actorId,
          body: dto.body.trim(),
          visibility: dto.visibility ?? 'all_parties',
          created_at: db.raw('NOW()'),
          updated_at: db.raw('NOW()'),
        })
        .returning('*')) as Record<string, unknown>[]
      if (!created) {
        throw new BusinessLogicException('Sprint review dispute comment was not created')
      }

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'create_sprint_review_dispute_comment',
        entity_type: 'sprint_review_dispute',
        entity_id: dto.dispute_id,
        new_values: {
          comment_id: created['id'],
          visibility: created['visibility'],
        },
      })

      return {
        ...(created as unknown as Omit<SprintReviewDisputeCommentResult, 'author_context'>),
        author_context: access.authorContext,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }
}
