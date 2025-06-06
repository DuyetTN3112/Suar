import { BaseCommand } from '#actions/shared/base_command'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import UserSkill from '#models/user_skill'
import { getLevelCodeFromPercentage } from '#constants/user_constants'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'

/**
 * DTO for CalculateSpiderChart
 */
export interface CalculateSpiderChartDTO {
  userId: DatabaseId
}

/**
 * Result of spider chart calculation
 */
export interface SpiderChartResult {
  userId: DatabaseId
  skillsCalculated: number
  totalReviews: number
}

/**
 * Command: Calculate Spider Chart Data for a User
 *
 * Di chuyển từ database procedure: calculate_spider_chart(p_user_id)
 *
 * v3: Spider chart data is now stored inline on user_skills table
 * (avg_percentage, level_code, last_calculated_at) instead of separate
 * user_spider_chart_data table.
 *
 * Business logic:
 * 1. Lấy tất cả skills có display_type = 'spider_chart' (soft_skill, delivery)
 * 2. Với mỗi skill, tính avg_percentage từ skill_reviews
 * 3. Xác định level tương ứng với avg_percentage
 * 4. Upsert vào user_skills
 */
export default class CalculateSpiderChartCommand extends BaseCommand<
  CalculateSpiderChartDTO,
  SpiderChartResult
> {
  async handle(dto: CalculateSpiderChartDTO): Promise<SpiderChartResult> {
    return await this.executeInTransaction(async (trx) => {
      // 1. Lấy tất cả skills có display_type = 'spider_chart'
      const skills = await this.getSpiderChartSkills(trx)

      let totalReviewsCount = 0

      // 2. Với mỗi skill, tính và upsert
      for (const skill of skills) {
        const { avgPercentage, totalReviews, levelCode } = await this.calculateSkillData(
          dto.userId,
          skill.id,
          trx
        )

        totalReviewsCount += totalReviews

        // 3. Upsert vào user_skills (v3: inline spider chart data)
        await this.upsertUserSkillData(
          dto.userId,
          skill.id,
          avgPercentage,
          levelCode,
          totalReviews,
          trx
        )
      }

      // 4. Log audit
      await this.logAudit('calculate_spider_chart', 'user_skill', dto.userId, null, {
        skills_calculated: skills.length,
        total_reviews: totalReviewsCount,
      })

      return {
        userId: dto.userId,
        skillsCalculated: skills.length,
        totalReviews: totalReviewsCount,
      }
    })
  }

  /**
   * Lấy tất cả skills có display_type = 'spider_chart'
   */
  private async getSpiderChartSkills(
    trx: TransactionClientContract
  ): Promise<Array<{ id: DatabaseId }>> {
    return SkillRepository.getSpiderChartSkillIds(trx)
  }

  /**
   * Tính average percentage và total reviews cho một skill
   * v3: uses getLevelCodeFromPercentage instead of ProficiencyLevel.findByPercentageRange
   */
  private async calculateSkillData(
    userId: DatabaseId,
    skillId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ avgPercentage: number; totalReviews: number; levelCode: string }> {
    // Tính average percentage từ skill_reviews → delegate to SkillReview
    const { avgPercentage, totalReviews } = await SkillReviewRepository.calculateSkillAvgPercentage(
      userId,
      skillId,
      trx
    )

    // v3: Tìm level tương ứng từ constant function
    const levelCode = getLevelCodeFromPercentage(avgPercentage)

    return { avgPercentage, totalReviews, levelCode }
  }

  /**
   * v3: Upsert vào user_skills table (replaces user_spider_chart_data)
   */
  private async upsertUserSkillData(
    userId: DatabaseId,
    skillId: DatabaseId,
    avgPercentage: number,
    levelCode: string,
    _totalReviews: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const existing = await UserSkill.query({ client: trx })
      .where('user_id', userId)
      .where('skill_id', skillId)
      .first()

    if (existing) {
      existing.avg_percentage = avgPercentage
      existing.level_code = levelCode
      existing.last_calculated_at = DateTime.now()
      await existing.useTransaction(trx).save()
    } else {
      await UserSkill.create(
        {
          user_id: String(userId),
          skill_id: String(skillId),
          level_code: levelCode,
          avg_percentage: avgPercentage,
          last_calculated_at: DateTime.now(),
          total_reviews: 0,
          avg_score: null,
        },
        { client: trx }
      )
    }
  }
}
