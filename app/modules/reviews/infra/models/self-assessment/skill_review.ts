import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'


import ReviewSession from '../review-session/review_session.js'

/**
 * SkillReview Model (v3)
 *
 * Individual skill rating within a review session.
 * assigned_public_proficiency_code: inline public proficiency code
 * is_fraud: đánh dấu review bị confirm fraud (flagged review confirmed)
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

  @column()
  declare assigned_public_proficiency_code: string

  @column()
  declare proficiency_level_id: string | null

  @column()
  declare observed_level_id: string | null

  @column()
  declare rubric_version_id: string | null

  @column()
  declare confidence: 'low' | 'medium' | 'high' | null

  @column()
  declare rationale: string | null

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value ?? []),
    consume: (value: string | string[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as string[]) : (value ?? []),
  })
  declare observable_behaviors: string[]

  @column()
  declare review_status: 'draft' | 'submitted' | 'superseded' | 'invalidated'

  @column()
  declare comment: string | null

  @column.dateTime()
  declare submitted_at: DateTime | null

  @column()
  declare superseded_by: string | null

  // v3.1: đánh dấu review bị confirm fraud (flagged review confirmed by admin)
  @column()
  declare is_fraud: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

}
