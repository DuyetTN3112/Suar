import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ReviewSession from './review_session.js'
import User from './user.js'

export default class ReviewEvidence extends BaseModel {
  static override table = 'review_evidences'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare review_session_id: string

  @column()
  declare evidence_type: string

  @column()
  declare url: string | null

  @column()
  declare title: string | null

  @column()
  declare description: string | null

  @column()
  declare uploaded_by: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare reviewSession: BelongsTo<typeof ReviewSession>

  @belongsTo(() => User, { foreignKey: 'uploaded_by' })
  declare uploader: BelongsTo<typeof User>
}
