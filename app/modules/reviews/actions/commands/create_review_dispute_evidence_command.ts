import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAddReviewDisputeEvidence } from '#modules/reviews/domain/review_dispute_rules'

export interface CreateReviewDisputeEvidenceDTO {
  dispute_id: string
  evidence_type: string
  url: string
  title?: string | null
  description?: string | null
}

export interface ReviewDisputeEvidenceResult {
  id: string
  dispute_id: string
  uploader_id: string
  uploader_context: ReviewDisputeAuthorContext
  evidence_type: string
  url: string
  title: string | null
  description: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class CreateReviewDisputeEvidenceCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: CreateReviewDisputeEvidenceDTO): Promise<ReviewDisputeEvidenceResult> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const access = await loadReviewDisputeAccessContext(trx, dto.dispute_id, actorId)
      const policyResult = canAddReviewDisputeEvidence({
        disputeStatus: access.dispute.status,
        evidenceType: dto.evidence_type,
        url: dto.url,
        isParticipant: access.isParticipant,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      if (!access.authorContext) {
        throw new ForbiddenException('Review dispute evidence uploader context is required')
      }

      const [created] = (await trx
        .table('review_dispute_evidences')
        .insert({
          dispute_id: dto.dispute_id,
          evidence_type: dto.evidence_type.trim(),
          url: dto.url.trim(),
          title: dto.title?.trim() ?? null,
          description: dto.description?.trim() ?? null,
          uploaded_by: actorId,
        })
        .returning('*')) as [Record<string, unknown>]

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_review_dispute_evidence',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            evidence_id: created.id,
            evidence_type: created.evidence_type,
            url: created.url,
          },
        })
      }

      return {
        ...(created as unknown as Omit<ReviewDisputeEvidenceResult, 'uploader_context' | 'uploader_id'>),
        uploader_id: actorId,
        uploader_context: access.authorContext,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
