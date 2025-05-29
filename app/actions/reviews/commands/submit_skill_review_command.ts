import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import ReviewSession from '#models/review_session'
import SkillReview from '#models/skill_review'
import Skill from '#models/skill'
import ProficiencyLevel from '#models/proficiency_level'
import type { SubmitSkillReviewDTO } from '#actions/reviews/dtos/review_dtos'
import CacheService from '#services/cache_service'

/**
 * SubmitSkillReviewCommand
 *
 * Submits skill reviews for a review session.
 * Updates session status based on review completion.
 */
export default class SubmitSkillReviewCommand extends BaseCommand<
  SubmitSkillReviewDTO,
  SkillReview[]
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: SubmitSkillReviewDTO): Promise<SkillReview[]> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser()!.id

      // Get review session
      const session = await ReviewSession.query({ client: trx })
        .where('id', dto.review_session_id)
        .whereIn('status', ['pending', 'in_progress'])
        .firstOrFail()

      // Check if user already submitted review for this session
      const existingReview = await SkillReview.query({ client: trx })
        .where('review_session_id', dto.review_session_id)
        .where('reviewer_id', userId)
        .first()

      if (existingReview) {
        throw new Error('You have already submitted a review for this session')
      }

      // Validate FK: skill_id and assigned_level_id for all ratings
      await this.validateForeignKeys(dto.skill_ratings, trx)

      // Create skill reviews
      const skillReviews: SkillReview[] = []
      for (const rating of dto.skill_ratings) {
        const review = await SkillReview.create(
          {
            review_session_id: dto.review_session_id,
            reviewer_id: userId,
            reviewer_type: dto.reviewer_type,
            skill_id: rating.skill_id,
            assigned_level_id: rating.assigned_level_id,
            comment: rating.comment || null,
          },
          { client: trx }
        )
        skillReviews.push(review)
      }

      // Update session status
      if (dto.reviewer_type === 'manager') {
        session.manager_review_completed = true
      } else {
        session.peer_reviews_count += 1
      }

      // Check if session is complete
      if (
        session.manager_review_completed &&
        session.peer_reviews_count >= session.required_peer_reviews
      ) {
        session.status = 'completed'
        session.completed_at = new Date() as any
      } else if (session.status === 'pending') {
        session.status = 'in_progress'
      }

      await session.useTransaction(trx).save()

      // Log audit
      await this.logAudit('submit_review', 'review_session', session.id, null, {
        reviewer_id: userId,
        reviewer_type: dto.reviewer_type,
        skills_reviewed: dto.skill_ratings.length,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`user:${session.reviewee_id}:*`)
      await CacheService.deleteByPattern(`review:session:${session.id}`)

      return skillReviews
    })
  }

  /**
   * Validate FK: skill_id -> skills.id and assigned_level_id -> proficiency_levels.id
   */
  private async validateForeignKeys(
    ratings: { skill_id: number; assigned_level_id: number }[],
    trx: unknown
  ): Promise<void> {
    for (const rating of ratings) {
      // Validate skill_id
      const skill = await Skill.query({ client: trx as any })
        .where('id', rating.skill_id)
        .first()
      if (!skill) {
        throw new Error(`Skill với ID ${rating.skill_id} không tồn tại`)
      }

      // Validate assigned_level_id
      const level = await ProficiencyLevel.query({ client: trx as any })
        .where('id', rating.assigned_level_id)
        .first()
      if (!level) {
        throw new Error(`Proficiency level với ID ${rating.assigned_level_id} không tồn tại`)
      }
    }
  }
}
