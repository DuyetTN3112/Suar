import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type {
  SprintReviewDisputeAuthorContext,
  SprintReviewDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
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

export default class CreateSprintReviewDisputeCommentCommand extends BaseCommand<
  CreateSprintReviewDisputeCommentDTO,
  SprintReviewDisputeCommentResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly disputes: SprintReviewDisputeUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(
    dto: CreateSprintReviewDisputeCommentDTO
  ): Promise<SprintReviewDisputeCommentResult> {
    return this.handle(dto)
  }

  async handle(
    dto: CreateSprintReviewDisputeCommentDTO
  ): Promise<SprintReviewDisputeCommentResult> {
    const actorId = this.requireUserId()
    return this.disputes.run(async (session) => {
      const access = await session.loadAccess(dto.dispute_id, actorId)
      if (!access.isParticipant || !access.authorContext) {
        throw new ForbiddenException('Sprint review dispute participant context is required')
      }
      if (CLOSED_STATUSES.has(access.dispute.status)) {
        throw new BusinessLogicException('Sprint review dispute is closed')
      }
      if (dto.body.trim().length === 0) {
        throw new BusinessLogicException('Sprint review dispute comment body is required')
      }

      const created = await session.createComment({
        id: this.cryptography.nextId(),
        disputeId: dto.dispute_id,
        authorId: actorId,
        body: dto.body.trim(),
        visibility: dto.visibility ?? 'all_parties',
      })
      if (!created['id']) {
        throw new BusinessLogicException('Sprint review dispute comment was not created')
      }

      await session.writeAudit(this.execCtx, {
        action: 'create_sprint_review_dispute_comment',
        entityId: dto.dispute_id,
        newValues: {
          comment_id: created['id'],
          visibility: created['visibility'],
        },
      })

      return {
        ...(created as unknown as Omit<SprintReviewDisputeCommentResult, 'author_context'>),
        author_context: access.authorContext,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }
}
