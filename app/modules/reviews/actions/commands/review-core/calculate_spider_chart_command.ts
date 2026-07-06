import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type {
  ReviewSkillReader,
  ReviewUserSkillWriter,
} from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { getLevelCodeFromPercentage } from '#modules/reviews/domain/review-core/review_formulas'

/**
 * DTO for CalculateSpiderChart
 */
export interface CalculateSpiderChartDTO {
  userId: string
}

/**
 * Result of spider chart calculation
 */
export interface SpiderChartResult {
  userId: string
  skillsCalculated: number
  totalReviews: number
}

/**
 * Command: Calculate Spider Chart Data for a User
 *
 * Di chuyển từ database procedure: calculate_spider_chart(p_user_id)
 *
 * v3: Spider chart data is now stored inline on user_skills table
 * (avg_percentage, verified_public_proficiency_code, last_calculated_at) instead of separate
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
  constructor(
    execCtx: ReviewActionContext,
    private readonly skillReader: ReviewSkillReader,
    private readonly userSkillWriter: ReviewUserSkillWriter,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly transactionRunner: ReviewTransactionRunner
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(dto: CalculateSpiderChartDTO): Promise<SpiderChartResult> {
    return this.transactionRunner.run(async (trx) => {
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
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'calculate_spider_chart',
            critical: true,
            entity_type: 'user_skill',
            entity_id: dto.userId,
            old_values: null,
            new_values: {
              skills_calculated: skills.length,
              total_reviews: totalReviewsCount,
            },
          },
          trx
        )
      }

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
  private async getSpiderChartSkills(trx: ReviewTransaction): Promise<{ id: string }[]> {
    return this.skillReader.listSpiderChartSkillIds(trx)
  }

  /**
   * Tính average percentage và total reviews cho một skill
   * v3: uses review formula mapping instead of ProficiencyLevel.findByPercentageRange
   */
  private async calculateSkillData(
    userId: string,
    skillId: string,
    trx: ReviewTransaction
  ): Promise<{ avgPercentage: number; totalReviews: number; levelCode: string }> {
    // Tính average percentage từ skill_reviews → delegate to SkillReview
    const { avgPercentage, totalReviews } =
      await this.metricsReader.calculateSkillAveragePercentage(userId, skillId, trx)

    // v3: Tìm level tương ứng từ review formula
    const levelCode = getLevelCodeFromPercentage(avgPercentage)

    return { avgPercentage, totalReviews, levelCode }
  }

  /**
   * v3: Upsert vào user_skills table (replaces user_spider_chart_data)
   */
  private async upsertUserSkillData(
    userId: string,
    skillId: string,
    avgPercentage: number,
    levelCode: string,
    _totalReviews: number,
    trx: ReviewTransaction
  ): Promise<void> {
    await this.userSkillWriter.upsertSpiderChartSkillData(
      userId,
      skillId,
      {
        avgPercentage,
        levelCode,
      },
      trx
    )
  }
}
