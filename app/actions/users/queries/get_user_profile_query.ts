import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import type User from '#models/user'
import UserRepository from '#repositories/user_repository'
import type { DatabaseId } from '#types/database'

/**
 * GetUserProfileDTO
 */
export class GetUserProfileDTO {
  declare user_id: DatabaseId
  declare include_skills: boolean
  declare include_spider_chart: boolean

  constructor(userId: DatabaseId, includeSkills = true, includeSpiderChart = true) {
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
      return await UserRepository.findProfileWithRelations(dto.user_id, {
        includeSkills: dto.include_skills,
      })
    })
  }
}
