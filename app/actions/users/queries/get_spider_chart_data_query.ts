import { BaseQuery } from '#actions/shared/base_query'
import type { DatabaseId } from '#types/database'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

/**
 * GetSpiderChartDataDTO
 */
export class GetSpiderChartDataDTO {
  declare user_id: DatabaseId

  constructor(userId: DatabaseId) {
    this.user_id = userId
  }
}

interface SpiderChartPoint {
  skill_id: DatabaseId
  skill_name: string
  skill_code: string
  category_code: string
  avg_percentage: number
  level_code: string | null
  total_reviews: number
}

interface SpiderChartResult {
  technical: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}

/**
 * GetSpiderChartDataQuery
 *
 * Fetches spider chart data for user's soft skills and delivery metrics.
 * v3: Data is now inline on user_skills table (avg_percentage, level_code)
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
    const cacheKey = `users:spider_chart:${dto.user_id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // v3: Query UserSkill with inline skill data (category_code, display_type on skills table)
      const data = await DefaultUserDependencies.skill.listUserSkillDetails(dto.user_id)

      const result: SpiderChartResult = {
        technical: [],
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
          level_code: item.level_code,
          total_reviews: item.total_reviews,
        }

        if (skill.category_code === 'technical') {
          result.technical.push(point)
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
