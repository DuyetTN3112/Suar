import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ReviewConfirmationEntry } from '#types/database'
import TaskAssignment from './task_assignment.js'
import User from './user.js'
import SkillReview from './skill_review.js'

/**
 * ReviewSession Model (v3)
 *
 * Represents a 360° review session for a task assignment.
 * confirmations: JSONB array replaces review_confirmations table.
 */
export default class ReviewSession extends BaseModel {
  static override table = 'review_sessions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare reviewee_id: string

  @column()
  declare status: 'pending' | 'in_progress' | 'completed' | 'disputed'

  @column()
  declare manager_review_completed: boolean

  @column()
  declare peer_reviews_count: number

  @column()
  declare required_peer_reviews: number

  // v3: JSONB column replaces review_confirmations table
  @column({
    prepare: (value: ReviewConfirmationEntry[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | ReviewConfirmationEntry[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : (value ?? null),
  })
  declare confirmations: ReviewConfirmationEntry[] | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime()
  declare completed_at: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => TaskAssignment, { foreignKey: 'task_assignment_id' })
  declare task_assignment: BelongsTo<typeof TaskAssignment>

  @belongsTo(() => User, { foreignKey: 'reviewee_id' })
  declare reviewee: BelongsTo<typeof User>

  @hasMany(() => SkillReview, { foreignKey: 'review_session_id' })
  declare skill_reviews: HasMany<typeof SkillReview>
}
