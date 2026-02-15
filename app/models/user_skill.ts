import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Skill from './skill.js'
import ProficiencyLevel from './proficiency_level.js'

/**
 * UserSkill Model
 *
 * Pivot table connecting Users with Skills:
 * - Tracks proficiency level for each skill
 * - Maintains review statistics
 * - Records average scores for spider chart data
 */
export default class UserSkill extends BaseModel {
  static override table = 'user_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare skill_id: string

  @column()
  declare proficiency_level_id: string

  @column()
  declare total_reviews: number

  @column()
  declare avg_score: number | null

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

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'proficiency_level_id',
  })
  declare proficiency_level: BelongsTo<typeof ProficiencyLevel>

  // ===== Helpers =====
  get hasBeenReviewed(): boolean {
    return this.total_reviews > 0
  }

  get displayScore(): string {
    if (this.avg_score === null) return 'N/A'
    return `${this.avg_score.toFixed(1)}%`
  }

  // ===== Static Methods =====
  static async findByUserAndSkill(userId: number, skillId: number) {
    return await this.query().where('user_id', userId).where('skill_id', skillId).first()
  }

  static async getUserSkillsWithDetails(userId: number) {
    return await this.query()
      .where('user_id', userId)
      .preload('skill', (query) => {
        void query.preload('category')
      })
      .preload('proficiency_level')
      .orderBy('created_at', 'desc')
  }
}
