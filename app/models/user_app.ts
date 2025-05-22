import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import App from './app.js'

export default class UserApp extends BaseModel {
  static table = 'user_apps'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: string

  @column()
  declare app_id: number

  @column()
  declare is_connected: boolean

  @column.dateTime()
  declare connected_at: DateTime | null

  @column()
  declare access_token: string | null

  @column()
  declare refresh_token: string | null

  @column.dateTime()
  declare expires_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => App, {
    foreignKey: 'app_id',
  })
  declare app: BelongsTo<typeof App>
}
