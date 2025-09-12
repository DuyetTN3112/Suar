import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import { canAccessReviewSession, canAddReviewEvidence } from '#domain/reviews/review_policy'
import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import type { ReviewEvidenceRecord } from '#types/review_records'

interface AddReviewEvidenceInput {
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
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
  async handle(dto: AddReviewEvidenceInput): Promise<ReviewEvidenceRecord> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const session = await ReviewSessionRepository.findById(dto.review_session_id, trx)
      enforcePolicy(canAccessReviewSession({ sessionExists: !!session }))
      if (!session) {
        throw new Error('Review session must exist after policy enforcement')
      }

      const submittedReview = await SkillReviewRepository.findBySessionAndReviewer(
        dto.review_session_id,
        userId,
        trx
      )
      enforcePolicy(
        canAddReviewEvidence({
          actorId: userId,
          sessionRevieweeId: session.reviewee_id,
          hasSubmittedReview: !!submittedReview,
        })
      )

      const evidence = await ReviewEvidenceRepository.create(
        {
          review_session_id: dto.review_session_id,
          evidence_type: dto.evidence_type,
          url: dto.url,
          title: dto.title,
          description: dto.description,
          uploaded_by: userId,
        },
        trx
      )

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_review_evidence',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            evidence_id: evidence.id,
            evidence_type: evidence.evidence_type,
          },
        })
      }

      return evidence
    })
  }
}
