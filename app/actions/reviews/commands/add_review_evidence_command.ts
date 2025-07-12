import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseCommand } from '#actions/shared/base_command'
import { canAccessReviewSession, canAddReviewEvidence } from '#domain/reviews/review_policy'
import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'

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
  import('#models/review_evidence').default
> {
  async handle(dto: AddReviewEvidenceInput): Promise<import('#models/review_evidence').default> {
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

      await this.logAudit('add_review_evidence', 'review_session', session.id, null, {
        evidence_id: evidence.id,
        evidence_type: evidence.evidence_type,
      })

      return evidence
    })
  }
}
