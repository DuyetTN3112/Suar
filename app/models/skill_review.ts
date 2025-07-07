import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ReviewSession from './review_session.js'
import Skill from './skill.js'
import User from './user.js'

/**
 * SkillReview Model (v3)
 *
 * Individual skill rating within a review session.
 * assigned_level_code: inline proficiency level string (replaces assigned_level_id FK)
 */
export default class SkillReview extends BaseModel {
  static override table = 'skill_reviews'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare review_session_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare reviewer_type: 'manager' | 'peer'

  @column()
  declare skill_id: string

  // v3: inline level code replaces assigned_level_id FK
  @column()
  declare assigned_level_code: string

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

  @belongsTo(() => User, { foreignKey: 'reviewer_id' })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Skill, { foreignKey: 'skill_id' })
  declare skill: BelongsTo<typeof Skill>
}
