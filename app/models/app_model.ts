import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AppCategory from './app_category.js'
import UserApp from './user_app.js'

export default class AppModel extends BaseModel {
  static table = 'apps'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare logo: string

  @column()
  declare connected: boolean

  @column()
  declare description: string | null

  @column()
  declare category_id: number | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => AppCategory, {
    foreignKey: 'category_id',
  })
  declare category: BelongsTo<typeof AppCategory>

  @hasMany(() => UserApp)
  declare user_apps: HasMany<typeof UserApp>
}
