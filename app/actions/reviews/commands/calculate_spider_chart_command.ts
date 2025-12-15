import { BaseCommand } from '#actions/shared/base_command'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * DTO for CalculateSpiderChart
 */
export interface CalculateSpiderChartDTO {
    userId: number
}

/**
 * Result of spider chart calculation
 */
export interface SpiderChartResult {
    userId: number
    skillsCalculated: number
    totalReviews: number
}

/**
 * Command: Calculate Spider Chart Data for a User
 *
 * Di chuyển từ database procedure: calculate_spider_chart(p_user_id)
 *
 * Business logic:
 * 1. Lấy tất cả skills có display_type = 'spider_chart' (soft_skill, delivery)
 * 2. Với mỗi skill, tính avg_percentage từ skill_reviews
 * 3. Xác định level tương ứng với avg_percentage
 * 4. Upsert vào user_spider_chart_data
 *
 * @example
 * const command = new CalculateSpiderChartCommand(ctx)
 * const result = await command.handle({ userId: 123 })
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
                const { avgPercentage, totalReviews, levelId } = await this.calculateSkillData(
                    dto.userId,
                    skill.id,
                    trx
                )

                totalReviewsCount += totalReviews

                // 3. Upsert vào user_spider_chart_data
                await this.upsertSpiderChartData(
                    dto.userId,
                    skill.id,
                    avgPercentage,
                    levelId,
                    totalReviews,
                    trx
                )
            }

            // 4. Log audit
            await this.logAudit('calculate_spider_chart', 'user_spider_chart_data', dto.userId, null, {
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
     * Chỉ lấy skills đang active
     */
    private async getSpiderChartSkills(
        trx: TransactionClientContract
    ): Promise<Array<{ id: number }>> {
        return await db
            .from('skills')
            .join('skill_categories', 'skill_categories.id', 'skills.category_id')
            .where('skill_categories.display_type', 'spider_chart')
            .where('skills.is_active', true)
            .select('skills.id')
            .useTransaction(trx)
    }

    /**
     * Tính average percentage và total reviews cho một skill
     * Logic từ database procedure
     */
    private async calculateSkillData(
        userId: number,
        skillId: number,
        trx: TransactionClientContract
    ): Promise<{ avgPercentage: number; totalReviews: number; levelId: number }> {
        // Tính average percentage từ skill_reviews
        // avg = (min_percentage + max_percentage) / 2 của assigned_level
        const result = await db
            .from('skill_reviews')
            .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
            .join('proficiency_levels', 'proficiency_levels.id', 'skill_reviews.assigned_level_id')
            .where('review_sessions.reviewee_id', userId)
            .where('skill_reviews.skill_id', skillId)
            .where('review_sessions.status', 'completed')
            .select(
                db.raw(
                    'COALESCE(AVG((proficiency_levels.min_percentage + proficiency_levels.max_percentage) / 2), 0) as avg_pct'
                ),
                db.raw('COUNT(*) as total_reviews')
            )
            .useTransaction(trx)
            .first()

        const avgPercentage = Number(result?.avg_pct || 0)
        const totalReviews = Number(result?.total_reviews || 0)

        // Tìm level tương ứng với avg_percentage
        const levelId = await this.findLevelByPercentage(avgPercentage, trx)

        return { avgPercentage, totalReviews, levelId }
    }

    /**
     * Tìm proficiency level dựa trên percentage
     * FIX từ database: xử lý edge case khi avg_pct = 100 (dùng <= thay vì <)
     */
    private async findLevelByPercentage(
        percentage: number,
        trx: TransactionClientContract
    ): Promise<number> {
        // Tìm level mà percentage nằm trong range [min, max]
        const level = await db
            .from('proficiency_levels')
            .where('min_percentage', '<=', percentage)
            .where('max_percentage', '>=', percentage)
            .orderBy('level_order', 'desc')
            .select('id')
            .useTransaction(trx)
            .first()

        if (level) return level.id

        // Fallback: level 1 (beginner) nếu không tìm được
        const fallback = await db
            .from('proficiency_levels')
            .where('level_order', 1)
            .select('id')
            .useTransaction(trx)
            .first()

        return fallback?.id || 1
    }

    /**
     * Upsert vào user_spider_chart_data
     * Dùng ON DUPLICATE KEY UPDATE pattern
     */
    private async upsertSpiderChartData(
        userId: number,
        skillId: number,
        avgPercentage: number,
        levelId: number,
        totalReviews: number,
        trx: TransactionClientContract
    ): Promise<void> {
        const now = new Date()

        // Check if exists
        const existing = await db
            .from('user_spider_chart_data')
            .where('user_id', userId)
            .where('skill_id', skillId)
            .useTransaction(trx)
            .first()

        if (existing) {
            // Update
            await db
                .from('user_spider_chart_data')
                .where('user_id', userId)
                .where('skill_id', skillId)
                .update({
                    avg_percentage: avgPercentage,
                    avg_level_id: levelId,
                    total_reviews: totalReviews,
                    last_calculated_at: now,
                    updated_at: now,
                })
                .useTransaction(trx)
        } else {
            // Insert
            await db
                .table('user_spider_chart_data')
                .insert({
                    user_id: userId,
                    skill_id: skillId,
                    avg_percentage: avgPercentage,
                    avg_level_id: levelId,
                    total_reviews: totalReviews,
                    last_calculated_at: now,
                    created_at: now,
                    updated_at: now,
                })
                .useTransaction(trx)
        }
    }
}
