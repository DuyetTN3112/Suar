import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import UserSpiderChartData from '#models/user_spider_chart_data'
import type { DatabaseId } from '#types/database'

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
  level_name: string | null
  total_reviews: number
}

interface SpiderChartResult {
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}

/**
 * GetSpiderChartDataQuery
 *
 * Fetches spider chart data for user's soft skills and delivery metrics.
 * Returns data grouped by category for easy rendering.
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetSpiderChartDataQuery extends BaseQuery<
  GetSpiderChartDataDTO,
  SpiderChartResult
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query to get spider chart data
   */
  async handle(dto: GetSpiderChartDataDTO): Promise<SpiderChartResult> {
    const cacheKey = `users:spider_chart:${String(dto.user_id)}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      const data = await UserSpiderChartData.query()
        .where('user_id', dto.user_id)
        .preload('skill', (skillQuery) => {
          void skillQuery.preload('category')
        })
        .preload('avg_level')

      const result: SpiderChartResult = {
        soft_skills: [],
        delivery: [],
      }

      for (const item of data) {
        // category is preloaded so it will exist as an object
        const categoryCode = item.skill.category.category_code

        const point: SpiderChartPoint = {
          skill_id: item.skill_id,
          skill_name: item.skill.skill_name,
          skill_code: item.skill.skill_code,
          category_code: categoryCode,
          avg_percentage: item.avg_percentage,
          // avg_level is preloaded - if avg_level_id was null, this would need runtime handling
          level_name: item.avg_level.level_name_en,
          total_reviews: item.total_reviews,
        }

        if (categoryCode === 'soft_skill') {
          result.soft_skills.push(point)
        } else if (categoryCode === 'delivery') {
          result.delivery.push(point)
        }
      }

      return result
    })
  }
}
