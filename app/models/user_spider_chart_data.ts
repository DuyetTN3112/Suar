import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Skill from './skill.js'
import ProficiencyLevel from './proficiency_level.js'

/**
 * UserSpiderChartData Model
 *
 * Pre-calculated spider chart data for Soft Skills and Delivery Metrics.
 * This is cached/calculated data for quick rendering of spider charts.
 */
export default class UserSpiderChartData extends BaseModel {
  static override table = 'user_spider_chart_data'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number

  @column()
  declare skill_id: number

  @column()
  declare avg_percentage: number

  @column()
  declare avg_level_id: number | null

  @column()
  declare total_reviews: number

  @column.dateTime()
  declare last_calculated_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Skill, {
    foreignKey: 'skill_id',
  })
  declare skill: BelongsTo<typeof Skill>

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'avg_level_id',
  })
  declare avg_level: BelongsTo<typeof ProficiencyLevel>

  // ===== Helpers =====
  get displayPercentage(): string {
    return `${this.avg_percentage.toFixed(1)}%`
  }

  // ===== Static Methods =====
  /**
   * Get spider chart data for a user
   */
  static async getSpiderChartDataForUser(userId: number) {
    return await this.query()
      .where('user_id', userId)
      .preload('skill', (query) => query.preload('category'))
      .preload('avg_level')
      .orderBy('skill_id', 'asc')
  }

  /**
   * Get spider chart data grouped by category
   */
  static async getGroupedSpiderChartData(userId: number) {
    const data = await this.getSpiderChartDataForUser(userId)

    const grouped: Record<
      string,
      Array<{
        skill_name: string
        skill_code: string
        avg_percentage: number
        level_name: string | null
      }>
    > = {}

    for (const item of data) {
      const categoryCode = item.skill?.category?.category_code || 'unknown'
      if (!grouped[categoryCode]) {
        grouped[categoryCode] = []
      }
      grouped[categoryCode].push({
        skill_name: item.skill?.skill_name || '',
        skill_code: item.skill?.skill_code || '',
        avg_percentage: item.avg_percentage,
        level_name: item.avg_level?.level_name_en || null,
      })
    }

    return grouped
  }
}
