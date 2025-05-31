import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Skill from './skill.js'

/**
 * SkillCategory Model
 *
 * Categories for skills:
 * - Technical Skills (display_type: list)
 * - Soft Skills (display_type: spider_chart)
 * - Delivery Metrics (display_type: spider_chart)
 */
export default class SkillCategory extends BaseModel {
  static override table = 'skill_categories'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare category_code: string

  @column()
  declare category_name: string

  @column()
  declare display_type: 'spider_chart' | 'list'

  @column()
  declare description: string | null

  @column()
  declare sort_order: number

  @column()
  declare is_active: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @hasMany(() => Skill, {
    foreignKey: 'category_id',
  })
  declare skills: HasMany<typeof Skill>

  // ===== Helpers =====
  get isSpiderChart(): boolean {
    return this.display_type === 'spider_chart'
  }

  get isTechnical(): boolean {
    return this.category_code === 'technical'
  }
}
