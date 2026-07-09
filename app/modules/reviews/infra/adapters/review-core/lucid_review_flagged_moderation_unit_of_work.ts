import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type {
  ResolveFlaggedReviewPersistenceInput,
  ReviewFlaggedModerationPersistenceSession,
  ReviewFlaggedModerationUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_flagged_moderation_unit_of_work'
import { stageTalentExplainabilityProjectionV1 } from '#modules/reviews/infra/adapters/self-assessment/lucid_talent_explainability_projection_stager'
import type FlaggedReview from '#modules/reviews/infra/models/review-core/flagged_review'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/review-core/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review-session/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/self-assessment/skill_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

export default class LucidReviewFlaggedModerationUnitOfWork
  implements ReviewFlaggedModerationUnitOfWork
{
  run<T>(
    work: (session: ReviewFlaggedModerationPersistenceSession) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (trx) =>
      work({
        transaction: trx,
        findFlaggedReviewForUpdate: (flaggedReviewId) =>
          FlaggedReviewRepository.findByIdForUpdate(flaggedReviewId, trx),
        saveResolution: (input) => this.saveResolution(input, trx),
        markSkillReviewAsFraudAndFindReviewee: async (skillReviewId) => {
          const skillReview = await SkillReviewRepository.findByIdForUpdate(skillReviewId, trx)
          if (!skillReview) {
            return null
          }

          skillReview.is_fraud = true
          await SkillReviewRepository.save(skillReview, trx)

          const reviewSession = await ReviewSessionRepository.findById(
            skillReview.review_session_id,
            trx
          )
          return reviewSession?.reviewee_id ?? null
        },
        stageTalentExplainabilityProjection: async (input) => {
          await stageTalentExplainabilityProjectionV1({
            trx,
            revieweeUserId: input.revieweeUserId,
            sourceEventName: 'flagged_review:resolved',
            sourceEventId: input.sourceEventId,
            occurredAt: input.occurredAt,
          })
        },
      })
    )
  }

  private async saveResolution(
    input: ResolveFlaggedReviewPersistenceInput,
    trx: Parameters<typeof FlaggedReviewRepository.findByIdForUpdate>[1]
  ): Promise<FlaggedReviewRecord> {
    const flaggedReview = input.flaggedReview as FlaggedReview
    flaggedReview.status = input.status
    flaggedReview.reviewed_by = input.reviewedBy
    flaggedReview.reviewed_at = DateTime.fromJSDate(input.reviewedAt)
    if (input.notes) {
      flaggedReview.notes = input.notes
    }
    return FlaggedReviewRepository.save(flaggedReview, trx)
  }
}
