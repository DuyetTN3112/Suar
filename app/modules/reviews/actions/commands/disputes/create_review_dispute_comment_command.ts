import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewDisputeAuthorContext } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canCommentOnReviewDispute } from '#modules/reviews/domain/disputes/review_dispute_rules'

export interface CreateReviewDisputeCommentDTO {
  dispute_id: string
  body: string
  visibility?: 'all_parties' | 'admin_only'
}

export interface ReviewDisputeCommentResult {
  id: string
  dispute_id: string
  author_id: string
  author_context: ReviewDisputeAuthorContext
  body: string
  visibility: 'all_parties' | 'admin_only'
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class CreateReviewDisputeCommentCommand extends BaseCommand<
  CreateReviewDisputeCommentDTO,
  ReviewDisputeCommentResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly disputes: ReviewDisputeUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: CreateReviewDisputeCommentDTO): Promise<ReviewDisputeCommentResult> {
    const actorId = requireUserId(this.execCtx)
    return this.disputes.run(async (session) => {
      const access = await session.loadAccess(dto.dispute_id, actorId)
      const policyResult = canCommentOnReviewDispute({
        disputeStatus: access.dispute.status,
        body: dto.body,
        isParticipant: access.isParticipant,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      if (!access.authorContext) {
        throw new ForbiddenException('Review dispute participant context is required')
      }

      const created = await session.createComment({
        disputeId: dto.dispute_id,
        authorId: actorId,
        body: dto.body.trim(),
        visibility: dto.visibility ?? 'all_parties',
      })

      if (this.execCtx.userId) {
        await session.writeAudit(this.execCtx, {
          userId: this.execCtx.userId,
          action: 'create_review_dispute_comment',
          entityId: dto.dispute_id,
          newValues: {
            comment_id: created['id'],
            visibility: created['visibility'],
          },
        })
      }

      return {
        ...(created as unknown as Omit<ReviewDisputeCommentResult, 'author_context'>),
        author_context: access.authorContext,
      }
    })
  }

  execute(dto: CreateReviewDisputeCommentDTO): Promise<ReviewDisputeCommentResult> {
    return this.handle(dto)
  }
}
