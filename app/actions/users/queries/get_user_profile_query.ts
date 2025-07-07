import { BaseQuery } from '#actions/shared/base_query'
import { calculateProfileCompleteness } from '#actions/users/utils/profile_completeness'
import UserRepository from '#infra/users/repositories/user_repository'
import type User from '#models/user'
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

export interface UserProfileResult {
  user: User
  completeness: number
}

/**
 * GetUserProfileQuery
 *
 * Fetches complete user profile including:
 * - Basic user info
 * - User details (avatar, bio, freelancer info)
 * - Skills with proficiency levels
 * - Spider chart data for soft skills
 * - Profile completeness percentage
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetUserProfileQuery extends BaseQuery<GetUserProfileDTO, UserProfileResult> {
  async handle(dto: GetUserProfileDTO): Promise<UserProfileResult> {
    const cacheKey = this.generateCacheKey('users:profile', {
      userId: dto.user_id,
      includeSkills: dto.include_skills,
      includeSpiderChart: dto.include_spider_chart,
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const user = await UserRepository.findProfileWithRelations(dto.user_id, {
        includeSkills: dto.include_skills,
      })
      return { user, completeness: calculateProfileCompleteness(user.serialize()) }
    })
  }
}
