import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import User from '#models/user'

/**
 * GetUserProfileDTO
 */
export class GetUserProfileDTO {
  declare user_id: number
  declare include_skills: boolean
  declare include_spider_chart: boolean

  constructor(userId: number, includeSkills = true, includeSpiderChart = true) {
    this.user_id = userId
    this.include_skills = includeSkills
    this.include_spider_chart = includeSpiderChart
  }
}

/**
 * GetUserProfileQuery
 *
 * Fetches complete user profile including:
 * - Basic user info
 * - User details (avatar, bio, freelancer info)
 * - Skills with proficiency levels
 * - Spider chart data for soft skills
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetUserProfileQuery extends BaseQuery<GetUserProfileDTO, User> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query to get user profile
   */
  async handle(dto: GetUserProfileDTO): Promise<User> {
    const cacheKey = this.generateCacheKey('users:profile', {
      userId: dto.user_id,
      includeSkills: dto.include_skills,
      includeSpiderChart: dto.include_spider_chart,
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const query = User.query()
        .where('id', dto.user_id)
        .whereNull('deleted_at')
        .preload('system_role')
        .preload('status')
        .preload('detail')
        .preload('current_organization')

      if (dto.include_skills) {
        query.preload('skills', (skillsQuery) => {
          skillsQuery
            .preload('skill', (sq) => sq.preload('category'))
            .preload('proficiency_level')
        })
      }

      if (dto.include_spider_chart) {
        query.preload('spider_chart_data', (chartQuery) => {
          chartQuery.preload('skill', (sq) => sq.preload('category')).preload('avg_level')
        })
      }

      const user = await query.firstOrFail()

      return user
    })
  }
}
