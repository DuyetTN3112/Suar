import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import UserSkill from './user_skill.js'

/**
 * ProficiencyLevel Model
 *
 * 8 proficiency levels from Beginner to Master:
 * 1. Beginner (0-12.5%)
 * 2. Elementary (12.5-25%)
 * 3. Junior (25-37.5%)
 * 4. Middle (37.5-50%)
 * 5. Senior (50-62.5%)
 * 6. Lead (62.5-75%)
 * 7. Principal (75-87.5%)
 * 8. Master (87.5-100%)
 */
export default class ProficiencyLevel extends BaseModel {
  static override table = 'proficiency_levels'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare level_order: number

  @column()
  declare level_code: string

  @column()
  declare level_name_en: string

  @column()
  declare level_name_vi: string

  @column()
  declare min_percentage: number

  @column()
  declare max_percentage: number

  @column()
  declare description: string | null

  @column()
  declare color_hex: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @hasMany(() => UserSkill, {
    foreignKey: 'proficiency_level_id',
  })
  declare user_skills: HasMany<typeof UserSkill>

  // ===== Helpers =====
  get displayName(): string {
    return `${this.level_name_en} (${this.level_name_vi})`
  }

  get percentageRange(): string {
    return `${this.min_percentage}% - ${this.max_percentage}%`
  }

  /**
   * Get level by percentage score
   */
  static async getLevelByPercentage(percentage: number): Promise<ProficiencyLevel | null> {
    return await this.query()
      .where('min_percentage', '<=', percentage)
      .where('max_percentage', '>=', percentage)
      .first()
  }

  /**
   * Get all levels ordered
   */
  static async getAllOrdered(): Promise<ProficiencyLevel[]> {
    return await this.query().orderBy('level_order', 'asc')
  }
}
