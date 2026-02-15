import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import TaskAssignment from './task_assignment.js'
import User from './user.js'
import SkillReview from './skill_review.js'
import ReviewConfirmation from './review_confirmation.js'

/**
 * ReviewSession Model
 *
 * Represents a 360° review session for a task assignment.
 * Each completed task can have one review session with:
 * - Manager review
 * - Peer reviews (min 2)
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

  @hasMany(() => ReviewConfirmation, { foreignKey: 'review_session_id' })
  declare confirmations: HasMany<typeof ReviewConfirmation>
}
