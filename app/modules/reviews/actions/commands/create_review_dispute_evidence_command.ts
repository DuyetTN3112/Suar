import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewDisputeAuthorContext } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_unit_of_work'
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
  constructor(
    private execCtx: ReviewActionContext,
    private readonly disputes: ReviewDisputeUnitOfWork
  ) {}

  async execute(dto: CreateReviewDisputeEvidenceDTO): Promise<ReviewDisputeEvidenceResult> {
    const actorId = requireUserId(this.execCtx)
    return this.disputes.run(async (session) => {
      const access = await session.loadAccess(dto.dispute_id, actorId)
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

      const created = await session.createEvidence({
        disputeId: dto.dispute_id,
        actorId,
        evidenceType: dto.evidence_type.trim(),
        url: dto.url.trim(),
        title: dto.title?.trim() ?? null,
        description: dto.description?.trim() ?? null,
      })

      if (this.execCtx.userId) {
        await session.writeAudit(this.execCtx, {
          userId: this.execCtx.userId,
          action: 'add_review_dispute_evidence',
          entityId: dto.dispute_id,
          newValues: {
            evidence_id: created['id'],
            evidence_type: created['evidence_type'],
            url: created['url'],
          },
        })
      }

      return {
        ...(created as unknown as Omit<
          ReviewDisputeEvidenceResult,
          'uploader_context' | 'uploader_id'
        >),
        uploader_id: actorId,
        uploader_context: access.authorContext,
      }
    })
  }
}
