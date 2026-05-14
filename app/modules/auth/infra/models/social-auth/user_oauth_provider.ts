import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UserOAuthProvider extends BaseModel {
  static override table = 'user_oauth_providers'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare provider: string

  @column()
  declare provider_id: string

  @column()
  declare email: string | null

  @column()
  declare access_token: string | null

  @column()
  declare refresh_token: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
