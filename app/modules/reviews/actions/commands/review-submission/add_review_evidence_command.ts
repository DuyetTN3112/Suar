import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewSessionArtifactUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_artifact_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAccessReviewSession, canAddReviewEvidence } from '#modules/reviews/domain/review-core/review_policy'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

interface AddReviewEvidenceInput {
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

/**
 * AddReviewEvidenceCommand
 *
 * Allows review participants to attach evidences to a review session.
 */
export default class AddReviewEvidenceCommand extends BaseCommand<
  AddReviewEvidenceInput,
  ReviewEvidenceRecord
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewSessionArtifactUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: AddReviewEvidenceInput): Promise<ReviewEvidenceRecord> {
    const userId = requireUserId(this.execCtx)

    return this.unitOfWork.run(async (persistence) => {
      const session = await persistence.loadSession(dto.review_session_id)
      enforcePolicy(canAccessReviewSession({ sessionExists: !!session }))
      if (!session) {
        throw new InvariantViolationException('Review session must exist after policy enforcement')
      }

      const hasAuthoredReview = await persistence.hasReviewAuthoredBy(
        dto.review_session_id,
        userId
      )
      enforcePolicy(
        canAddReviewEvidence({
          actorId: userId,
          sessionRevieweeId: session.revieweeId,
          hasSubmittedReview: hasAuthoredReview,
        })
      )

      const evidence = await persistence.createEvidence({
        reviewSessionId: dto.review_session_id,
        evidenceType: dto.evidence_type,
        url: dto.url,
        title: dto.title,
        description: dto.description,
        uploadedBy: userId,
      })
      await persistence.writeAudit(this.execCtx, {
        userId,
        action: 'add_review_evidence',
        entityId: session.id,
        newValues: {
          evidence_id: evidence.id,
          evidence_type: evidence.evidence_type,
        },
      })

      return evidence
    })
  }
}
