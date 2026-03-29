import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { BaseCommand } from '#actions/shared/base_command'
import type SkillReview from '#models/skill_review'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import { ProficiencyLevel } from '#constants'
import { ReviewSessionStatus } from '#constants/review_constants'
import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import type { SubmitSkillReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { determineSessionStatus } from '#domain/reviews/review_formulas'

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
  async handle(dto: SubmitSkillReviewDTO): Promise<SkillReview[]> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get review session
      const session = await ReviewSessionRepository.findByIdWithAllowedStatuses(
        dto.review_session_id,
        [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS],
        trx
      )
      if (!session) {
        throw new NotFoundException(
          'Review session không tồn tại hoặc không ở trạng thái có thể submit'
        )
      }

      // Check if user already submitted review for this session
      const existingReview = await SkillReviewRepository.findBySessionAndReviewer(
        dto.review_session_id,
        userId,
        trx
      )

      if (existingReview) {
        throw new ConflictException('You have already submitted a review for this session')
      }

      // Validate FK: skill_id and assigned_level_code for all ratings
      await this.validateForeignKeys(dto.skill_ratings, trx)

      // Create skill reviews
      const skillReviews = await SkillReviewRepository.createMany(
        dto.skill_ratings.map((rating) => ({
          review_session_id: dto.review_session_id,
          reviewer_id: userId,
          reviewer_type: dto.reviewer_type,
          skill_id: rating.skill_id,
          assigned_level_code: rating.assigned_level_code,
          comment: rating.comment || null,
        })),
        trx
      )

      // Update session counters
      if (dto.reviewer_type === 'manager') {
        session.manager_review_completed = true

        // v5: manager can submit overall execution quality dimensions
        session.overall_quality_score = dto.overall_quality_score
        session.delivery_timeliness = dto.delivery_timeliness
        session.requirement_adherence = dto.requirement_adherence
        session.communication_quality = dto.communication_quality
        session.code_quality_score = dto.code_quality_score
        session.proactiveness_score = dto.proactiveness_score
        session.would_work_with_again = dto.would_work_with_again
        session.strengths_observed = dto.strengths_observed
        session.areas_for_improvement = dto.areas_for_improvement
      } else {
        session.peer_reviews_count += 1
      }

      // Determine new session status via pure rule
      const newStatus = determineSessionStatus(
        session.manager_review_completed,
        session.peer_reviews_count,
        session.required_peer_reviews,
        session.status
      )
      session.status = newStatus
      if (newStatus === 'completed') {
        session.completed_at = DateTime.now()
      }

      await ReviewSessionRepository.save(session, trx)

      // Log audit
      await this.logAudit('submit_review', 'review_session', session.id, null, {
        reviewer_id: userId,
        reviewer_type: dto.reviewer_type,
        skills_reviewed: dto.skill_ratings.length,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`user:${session.reviewee_id}:*`)
      await CacheService.deleteByPattern(`review:session:${session.id}`)

      // Emit domain event for spider chart recalculation
      const scores: Record<string, number> = {}
      for (const review of skillReviews) {
        scores[review.skill_id] = 0 // Placeholder — actual score computed by spider chart
      }
      void emitter.emit('review:submitted', {
        reviewSessionId: dto.review_session_id,
        reviewerId: userId,
        revieweeId: session.reviewee_id,
        taskId: session.task_assignment_id,
        scores,
      })

      return skillReviews
    })
  }

  /**
   * Validate FK: skill_id -> skills.id and assigned_level_code -> ProficiencyLevel enum
   */
  private async validateForeignKeys(
    ratings: { skill_id: DatabaseId; assigned_level_code: string }[],
    trx: TransactionClientContract
  ): Promise<void> {
    const skills = await SkillRepository.findByIds(
      ratings.map((rating) => rating.skill_id),
      trx
    )
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]))

    for (const rating of ratings) {
      const skill = skillMap.get(rating.skill_id)
      if (!skill) {
        throw new NotFoundException(`Skill với ID ${rating.skill_id} không tồn tại`)
      }

      if (!skill.is_active) {
        throw new BusinessLogicException(`Skill với ID ${rating.skill_id} đã bị vô hiệu hóa`)
      }

      // Validate assigned_level_code is a valid ProficiencyLevel constant
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(rating.assigned_level_code)) {
        throw new BusinessLogicException(
          `Proficiency level không hợp lệ: ${rating.assigned_level_code}`
        )
      }
    }
  }
}
