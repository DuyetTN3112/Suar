import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { BaseQuery } from '#modules/users/actions/base_query'


/**
 * GetSpiderChartDataDTO
 */
export class GetSpiderChartDataDTO {
  declare user_id: string

  constructor(userId: string) {
    this.user_id = userId
  }
}

interface SpiderChartPoint {
  skill_id: string
  skill_name: string
  skill_code: string
  category_code: string
  avg_percentage: number
  verified_public_proficiency_code: string | null
  total_reviews: number
}

interface SpiderChartResult {
  technology: SpiderChartPoint[]
  engineering: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}

/**
 * GetSpiderChartDataQuery
 *
 * Fetches spider chart data for user's categorized skills.
 * v3: Data is now inline on user_skills table
 * and skills have inline category_code + display_type.
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetSpiderChartDataQuery extends BaseQuery<
  GetSpiderChartDataDTO,
  SpiderChartResult
> {
  /**
   * Execute the query to get spider chart data
   */
  async handle(dto: GetSpiderChartDataDTO): Promise<SpiderChartResult> {
    const cacheKey = `users:spider_chart:v4:${dto.user_id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // v3: Query UserSkill with inline skill data (category_code, display_type on skills table)
      const data = await DefaultUserDependencies.skill.listUserSkillDetails(dto.user_id)

      const result: SpiderChartResult = {
        technology: [],
        engineering: [],
        soft_skills: [],
        delivery: [],
      }

      for (const item of data) {
        // v3: category_code and display_type are inline on skills table
        const skill = item.skill
        if (skill.display_type !== 'spider_chart') continue

        const point: SpiderChartPoint = {
          skill_id: item.skill_id,
          skill_name: skill.skill_name,
          skill_code: skill.skill_code,
          category_code: skill.category_code,
          avg_percentage: item.avg_percentage ?? 0,
          verified_public_proficiency_code: item.verified_public_proficiency_code,
          total_reviews: item.total_reviews,
        }

        if (skill.category_code === 'technology') {
          result.technology.push(point)
        } else if (skill.category_code === 'engineering') {
          result.engineering.push(point)
        } else if (skill.category_code === 'soft_skill') {
          result.soft_skills.push(point)
        } else if (skill.category_code === 'delivery') {
          result.delivery.push(point)
        }
      }

      return result
    })
  }
}
