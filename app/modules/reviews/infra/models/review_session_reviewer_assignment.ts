import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ReviewSession from './review_session.js'

import { UserModel } from '#modules/users/public_contracts/user_model'

export type ReviewSessionReviewerAssignmentRole =
  | 'creator_required'
  | 'manager_required'
  | 'peer_required'
  | 'manager_optional'
  | 'peer_optional'

export type ReviewSessionReviewerAssignmentStatus = 'pending' | 'submitted' | 'waived'

export default class ReviewSessionReviewerAssignment extends BaseModel {
  static override table = 'review_session_reviewer_assignments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare review_session_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare reviewer_type: 'manager' | 'peer'

  @column()
  declare assignment_role: ReviewSessionReviewerAssignmentRole

  @column()
  declare is_required: boolean

  @column()
  declare status: ReviewSessionReviewerAssignmentStatus

  @column.dateTime()
  declare due_at: DateTime | null

  @column.dateTime()
  declare submitted_at: DateTime | null

  @column.dateTime()
  declare reminded_at: DateTime | null

  @column.dateTime()
  declare escalated_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

  @belongsTo(() => UserModel, { foreignKey: 'reviewer_id' })
  declare reviewer: BelongsTo<typeof UserModel>
}
