import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import UserRepository from '#infra/users/repositories/user_repository'
import db from '@adonisjs/lucid/services/db'
import type { DatabaseId } from '#types/database'

/**
 * GetFeaturedReviewsDTO
 */
export class GetFeaturedReviewsDTO {
  declare user_id: DatabaseId
  declare limit: number

  constructor(userId: DatabaseId, limit: number = 2) {
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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetFeaturedReviewsDTO): Promise<FeaturedReviewItem[]> {
    const cacheKey = `users:featured_reviews:${String(dto.user_id)}:${dto.limit}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // Fetch from repository (Infra Layer)
      const topSkills = await UserRepository.findTopReviewedSkills(dto.user_id, dto.limit)

      // For each skill, get a representative review (latest one if available)
      const results: FeaturedReviewItem[] = []

      for (const skill of topSkills) {
        // Get a review for this skill + reviewee
        const review = await UserRepository.findReviewForSkill(
          dto.user_id,
          String(skill.skill_id)
        )

        let reviewer_name = 'Đánh giá kỹ thuật'
        let reviewer_role = `${skill.total_reviews} lượt đánh giá`
        let stars = Math.max(1, Math.min(5, Math.round((skill.avg_percentage ?? 20) / 20)))
        let content =
          skill.total_reviews > 0
            ? `${skill.skill_name} đang giữ mức ${this.getLevelLabel(skill.level_code)} với điểm trung bình ${(skill.avg_percentage ?? 0).toFixed(1)}%.`
            : `${skill.skill_name} mới được khai báo, chưa có lượt review để chấm điểm.`
        let task_name = `Skill: ${skill.skill_name}`

        if (review) {
          reviewer_name = review.reviewer_name || reviewer_name
          reviewer_role =
            review.reviewer_role === 'manager'
              ? 'Project Manager'
              : review.reviewer_role === 'peer'
                ? 'Đồng nghiệp'
                : reviewer_role
          stars = review.rating ?? stars
          content = review.comment || content

          if (review.task_id) {
            const task = await db
              .from('tasks')
              .where('id', review.task_id)
              .select('title')
              .first()
            if (task) {
              task_name = `Task: ${task.title}`
            }
          }
        }

        results.push({
          skill_id: String(skill.skill_id),
          skill_name: skill.skill_name,
          level_code: skill.level_code,
          avg_percentage: skill.avg_percentage ?? 0,
          total_reviews: skill.total_reviews,
          reviewer_name,
          reviewer_role,
          stars,
          content,
          task_name,
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
}
