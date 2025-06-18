import { BaseQuery } from '#actions/shared/base_query'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import type { DatabaseId } from '#types/database'

/**
 * GetUserSkillsDTO
 */
export class GetUserSkillsDTO {
  declare user_id: DatabaseId
  declare category_code?: string

  constructor(userId: DatabaseId, categoryCode?: string) {
    this.user_id = userId
    this.category_code = categoryCode
  }
}

interface UserSkillResult {
  id: DatabaseId
  skill_id: DatabaseId
  skill_name: string
  skill_code: string
  category_name: string
  category_code: string
  level_code: string
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: string | null
}

/**
 * GetUserSkillsQuery
 *
 * Fetches user's skills with proficiency levels and review stats.
 * Can filter by skill category.
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetUserSkillsQuery extends BaseQuery<GetUserSkillsDTO, UserSkillResult[]> {
  /**
   * Execute the query to get user skills
   */
  async handle(dto: GetUserSkillsDTO): Promise<UserSkillResult[]> {
    const cacheKey = this.generateCacheKey('users:skills', {
      userId: dto.user_id,
      category: dto.category_code || 'all',
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const query = SkillRepository.findUserSkillsWithSkill(dto.user_id)

      const userSkills = await query

      // Filter by category if specified (v3: category_code is inline on skills table)
      let filteredSkills = userSkills
      if (dto.category_code) {
        filteredSkills = userSkills.filter((us) => us.skill.category_code === dto.category_code)
      }

      // Map to result format (v3: level_code is inline on user_skills)
      return filteredSkills.map((us) => ({
        id: us.id,
        skill_id: us.skill_id,
        skill_name: us.skill.skill_name,
        skill_code: us.skill.skill_code,
        category_name: us.skill.category_code,
        category_code: us.skill.category_code,
        level_code: us.level_code,
        total_reviews: us.total_reviews,
        avg_score: us.avg_score,
        avg_percentage: us.avg_percentage,
        last_reviewed_at: us.last_reviewed_at?.toISO() ?? null,
      }))
    })
  }
}
