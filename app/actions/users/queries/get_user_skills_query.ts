import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import UserSkill from '#models/user_skill'

/**
 * GetUserSkillsDTO
 */
export class GetUserSkillsDTO {
  declare user_id: number
  declare category_code?: string

  constructor(userId: number, categoryCode?: string) {
    this.user_id = userId
    this.category_code = categoryCode
  }
}

interface UserSkillResult {
  id: number
  skill_id: number
  skill_name: string
  skill_code: string
  category_name: string
  category_code: string
  proficiency_level_id: number
  level_name: string
  level_order: number
  level_color: string
  total_reviews: number
  avg_score: number | null
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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query to get user skills
   */
  async handle(dto: GetUserSkillsDTO): Promise<UserSkillResult[]> {
    const cacheKey = this.generateCacheKey('users:skills', {
      userId: dto.user_id,
      category: dto.category_code || 'all',
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      let query = UserSkill.query()
        .where('user_id', dto.user_id)
        .preload('skill', (skillQuery) => {
          skillQuery.preload('category')
        })
        .preload('proficiency_level')

      const userSkills = await query

      // Filter by category if specified
      let filteredSkills = userSkills
      if (dto.category_code) {
        filteredSkills = userSkills.filter(
          (us) => us.skill?.category?.category_code === dto.category_code
        )
      }

      // Map to result format
      return filteredSkills.map((us) => ({
        id: us.id,
        skill_id: us.skill_id,
        skill_name: us.skill?.skill_name || '',
        skill_code: us.skill?.skill_code || '',
        category_name: us.skill?.category?.category_name || '',
        category_code: us.skill?.category?.category_code || '',
        proficiency_level_id: us.proficiency_level_id,
        level_name: us.proficiency_level?.level_name_en || '',
        level_order: us.proficiency_level?.level_order || 0,
        level_color: us.proficiency_level?.color_hex || '#6B7280',
        total_reviews: us.total_reviews,
        avg_score: us.avg_score,
        last_reviewed_at: us.last_reviewed_at?.toISO() || null,
      }))
    })
  }
}
