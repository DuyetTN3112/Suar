import { BaseCommand } from '#actions/shared/base_command'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import ForbiddenException from '#exceptions/forbidden_exception'

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
      if (!session) {
        throw new ForbiddenException('Review session không tồn tại')
      }

      const submittedReview = await SkillReviewRepository.findBySessionAndReviewer(
        dto.review_session_id,
        userId,
        trx
      )

      const canAttach = session.reviewee_id === userId || !!submittedReview
      if (!canAttach) {
        throw new ForbiddenException('Bạn không có quyền thêm evidence cho review này')
      }

      const evidence = await ReviewEvidenceRepository.create(
        {
          review_session_id: dto.review_session_id,
          evidence_type: dto.evidence_type,
          url: dto.url,
          title: dto.title,
          description: dto.description,
          uploaded_by: userId,
        },
        { client: trx }
      )

      await this.logAudit('add_review_evidence', 'review_session', session.id, null, {
        evidence_id: evidence.id,
        evidence_type: evidence.evidence_type,
      })

      return evidence
    })
  }
}
