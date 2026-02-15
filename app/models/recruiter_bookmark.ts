import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * Model: RecruiterBookmark
 * Table: recruiter_bookmarks
 * Mô tả: Recruiters bookmark talents để theo dõi
 */
export default class RecruiterBookmark extends BaseModel {
  static override table = 'recruiter_bookmarks'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare recruiter_user_id: string

  @column()
  declare talent_user_id: string

  @column()
  declare notes: string | null

  @column()
  declare folder: string | null // Default: 'General'

  @column()
  declare rating: number | null // 1-5

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relations
  @belongsTo(() => User, { foreignKey: 'recruiter_user_id' })
  declare recruiter: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'talent_user_id' })
  declare talent: BelongsTo<typeof User>
}
