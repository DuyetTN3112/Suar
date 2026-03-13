import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Skill from './skill.js'

/**
 * UserSkill Model (v3)
 *
 * Pivot table connecting Users with Skills:
 * - level_code: inline proficiency level string (replaces proficiency_level_id FK)
 * - avg_percentage + last_calculated_at: merged from user_spider_chart_data
 * - Maintains review statistics
 */
export default class UserSkill extends BaseModel {
  static override table = 'user_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare skill_id: string

  // v3: inline level code replaces proficiency_level_id FK
  @column()
  declare level_code: string

  @column()
  declare total_reviews: number

  @column()
  declare avg_score: number | null

  // v3.1: Skill source — 'imported' (self-declared) or 'reviewed' (confirmed via review)
  @column()
  declare source: 'imported' | 'reviewed'

  // v3: merged from user_spider_chart_data
  @column()
  declare avg_percentage: number | null

  // v3: merged from user_spider_chart_data
  @column.dateTime()
  declare last_calculated_at: DateTime | null

  @column.dateTime()
  declare last_reviewed_at: DateTime | null

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

  // ===== Helpers =====
  get hasBeenReviewed(): boolean {
    return this.total_reviews > 0
  }

  get displayScore(): string {
    if (this.avg_score === null) return 'N/A'
    return `${this.avg_score.toFixed(1)}%`
  }


}
