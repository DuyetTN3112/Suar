import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class UserSetting extends BaseModel {
  static table = 'user_settings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number

  @column()
  declare theme: 'light' | 'dark' | 'system'

  @column()
  declare notifications_enabled: boolean

  @column()
  declare display_mode: 'grid' | 'list'

  @column()
  declare timezone: string

  @column()
  declare font: string

  @column()
  declare layout: string

  @column()
  declare density: string

  @column()
  declare animations_enabled: boolean

  @column()
  declare custom_scrollbars: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
