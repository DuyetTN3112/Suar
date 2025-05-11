import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SkillCategory from './skill_category.js'
import UserSkill from './user_skill.js'

/**
 * Skill Model
 *
 * Individual skills belonging to categories:
 * - Technical: React, TypeScript, Node.js, etc.
 * - Soft Skills: Communication, Teamwork, etc.
 * - Delivery Metrics: Code Quality, Documentation, etc.
 */
export default class Skill extends BaseModel {
  static override table = 'skills'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare category_id: number

  @column()
  declare skill_code: string

  @column()
  declare skill_name: string

  @column()
  declare description: string | null

  @column()
  declare icon_url: string | null

  @column()
  declare is_active: boolean

  @column()
  declare sort_order: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @belongsTo(() => SkillCategory, {
    foreignKey: 'category_id',
  })
  declare category: BelongsTo<typeof SkillCategory>

  @hasMany(() => UserSkill, {
    foreignKey: 'skill_id',
  })
  declare user_skills: HasMany<typeof UserSkill>

  // ===== Scopes =====
  static activeSkills() {
    return this.query().where('is_active', true).orderBy('sort_order', 'asc')
  }

  static byCategory(categoryId: number) {
    return this.query()
      .where('category_id', categoryId)
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
  }
}
