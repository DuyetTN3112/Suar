import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'


import ReviewSessionReviewerAssignment from './review_session_reviewer_assignment.js'
import SkillReview from './skill_review.js'

import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

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
  declare creator_reviewer_id: string | null

  @column()
  declare creator_review_completed: boolean

  @column()
  declare manager_reviews_count: number

  @column()
  declare peer_reviews_count: number

  @column()
  declare required_peer_reviews: number

  @column()
  declare required_total_reviews: number

  @column()
  declare minimum_manager_reviews: number

  @column()
  declare minimum_peer_reviews: number

  // v3: JSONB column replaces review_confirmations table
  @column({
    prepare: (value: ReviewConfirmationEntry[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | ReviewConfirmationEntry[] | null) =>
      typeof value === 'string'
        ? (JSON.parse(value) as ReviewConfirmationEntry[])
        : (value ?? null),
  })
  declare confirmations: ReviewConfirmationEntry[] | null

  // v5: overall quality/performance dimensions for completed sessions
  @column()
  declare overall_quality_score: number | null

  @column()
  declare delivery_timeliness: string | null

  @column()
  declare requirement_adherence: number | null

  @column()
  declare communication_quality: number | null

  @column()
  declare code_quality_score: number | null

  @column()
  declare proactiveness_score: number | null

  @column()
  declare would_work_with_again: boolean | null

  @column()
  declare strengths_observed: string | null

  @column()
  declare areas_for_improvement: string | null

  // v3.1: Deadline for the review session (auto-calculated on creation)
  @column.dateTime()
  declare deadline: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime()
  declare completed_at: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @hasMany(() => SkillReview, { foreignKey: 'review_session_id' })
  declare skill_reviews: HasMany<typeof SkillReview>

  @hasMany(() => ReviewSessionReviewerAssignment, { foreignKey: 'review_session_id' })
  declare reviewer_assignments: HasMany<typeof ReviewSessionReviewerAssignment>
}
