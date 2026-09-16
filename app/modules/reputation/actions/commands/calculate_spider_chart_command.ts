import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reputation/actions/base_command'
import { getLevelCodeFromPercentage } from '#modules/reputation/domain/reputation_formulas'
import type {
  CalculateSpiderChartDTO,
  SpiderChartResult,
} from '#modules/reputation/public_contracts/reputation_contracts'
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

export type { CalculateSpiderChartDTO, SpiderChartResult }

/**
 * Command: Calculate Spider Chart Data for a User
 *
 * Mastered in reputation bounded context.
 * Spider chart data is stored inline on user_skills table.
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
    private readonly transactionRunnerInstance: ReviewTransactionRunner
  ) {
    super(execCtx, transactionRunnerInstance)
  }

  async handle(dto: CalculateSpiderChartDTO): Promise<SpiderChartResult> {
    return this.transactionRunnerInstance.run(async (trx) => {
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

        // 3. Upsert vào user_skills
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

  private async getSpiderChartSkills(trx: ReviewTransaction): Promise<{ id: string }[]> {
    return this.skillReader.listSpiderChartSkillIds(trx)
  }

  private async calculateSkillData(
    userId: string,
    skillId: string,
    trx: ReviewTransaction
  ): Promise<{ avgPercentage: number; totalReviews: number; levelCode: string }> {
    const { avgPercentage, totalReviews } =
      await this.metricsReader.calculateSkillAveragePercentage(userId, skillId, trx)

    const levelCode = getLevelCodeFromPercentage(avgPercentage)

    return { avgPercentage, totalReviews, levelCode }
  }

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
