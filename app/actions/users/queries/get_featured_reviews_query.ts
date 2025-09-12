import { BaseQuery } from '#actions/users/base_query'
import * as userAnalyticsQueries from '#infra/users/repositories/read/analytics_queries'
import type { TopReviewedSkillRow } from '#infra/users/repositories/read/types'
import type { DatabaseId } from '#types/database'

/**
 * GetFeaturedReviewsDTO
 */
export class GetFeaturedReviewsDTO {
  declare user_id: DatabaseId
  declare limit: number

  constructor(userId: DatabaseId, limit = 2) {
    this.user_id = userId
    this.limit = limit
  }
}

/**
 * Featured review item
 */
export interface FeaturedReviewItem {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number
  total_reviews: number
  reviewer_name: string
  reviewer_role: string
  stars: number
  content: string
  task_name: string
}

/**
 * GetFeaturedReviewsQuery
 *
 * Fetches top reviewed skills for featured insights display.
 *
 * CQRS Pattern: Read operation (Application Layer - Orchestration)
 * Uses repository for data access (Infra Layer)
 * Returns top N skills sorted by (total_reviews DESC, avg_percentage DESC)
 * Uses caching for performance (5 min TTL)
 */
export default class GetFeaturedReviewsQuery extends BaseQuery<
  GetFeaturedReviewsDTO,
  FeaturedReviewItem[]
> {
  async handle(dto: GetFeaturedReviewsDTO): Promise<FeaturedReviewItem[]> {
    const cacheKey = `users:featured_reviews:${dto.user_id}:${dto.limit}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // Fetch from repository (Infra Layer)
      const topSkills = await userAnalyticsQueries.findTopReviewedSkills(dto.user_id, dto.limit)

      // For each skill, get a representative review (latest one if available)
      const results: FeaturedReviewItem[] = []

      for (const skill of topSkills) {
        // Get a review for this skill + reviewee
        const review = await userAnalyticsQueries.findReviewForSkill(dto.user_id, skill.skill_id)
        const avgPercentage = this.toNumber(skill.avg_percentage)

        let reviewerName = 'Đánh giá kỹ thuật'
        let reviewerRole = `${skill.total_reviews} lượt đánh giá`
        let stars = Math.max(1, Math.min(5, Math.round((avgPercentage || 20) / 20)))
        let content =
          skill.total_reviews > 0
            ? `${skill.skill_name} đang giữ mức ${this.getLevelLabel(skill.level_code)} với điểm trung bình ${avgPercentage.toFixed(1)}%.`
            : `${skill.skill_name} mới được khai báo, chưa có lượt review để chấm điểm.`
        let taskName = `Skill: ${skill.skill_name}`

        if (review) {
          reviewerName = review.reviewer_name ?? reviewerName
          reviewerRole =
            review.reviewer_role === 'manager'
              ? 'Project Manager'
              : review.reviewer_role === 'peer'
                ? 'Đồng nghiệp'
                : reviewerRole
          stars = review.rating ?? stars
          content = review.comment ?? content

          if (review.task_id) {
            const taskTitle = await userAnalyticsQueries.findTaskTitleById(review.task_id)
            if (taskTitle) {
              taskName = `Task: ${taskTitle}`
            }
          }
        }

        results.push({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          level_code: skill.level_code,
          avg_percentage: avgPercentage,
          total_reviews: skill.total_reviews,
          reviewer_name: reviewerName,
          reviewer_role: reviewerRole,
          stars,
          content,
          task_name: taskName,
        })
      }

      return results
    })
  }

  private getLevelLabel(levelCode: string): string {
    const code = levelCode.toLowerCase()
    if (code.includes('begin')) return 'Beginner'
    if (code.includes('jun')) return 'Junior'
    if (code.includes('mid')) return 'Middle'
    if (code.includes('sen')) return 'Senior'
    if (code.includes('lead')) return 'Lead'
    return levelCode
  }

  private toNumber(value: TopReviewedSkillRow['avg_percentage']): number {
    if (typeof value === 'number') {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }
}
