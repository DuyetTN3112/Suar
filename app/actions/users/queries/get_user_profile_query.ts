import { BaseQuery } from '#actions/users/base_query'
import { calculateProfileCompleteness } from '#actions/users/utils/profile_completeness'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import type { DatabaseId } from '#types/database'
import type { UserProfileRecord } from '#types/user_records'

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
  user: UserProfileRecord
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
      const serializedUser = await userModelQueries.findProfileWithRelationsRecord(dto.user_id, {
        includeSkills: dto.include_skills,
      })
      return { user: serializedUser, completeness: calculateProfileCompleteness(serializedUser) }
    })
  }
}
