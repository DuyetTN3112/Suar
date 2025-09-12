import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProficiencyLevel from './proficiency_level.js'

export default class ProficiencyScale extends BaseModel {
  static override table = 'proficiency_scales'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare version: number

  @column()
  declare is_active: boolean

  @column.dateTime()
  declare effective_from: DateTime | null

  @column.dateTime()
  declare effective_to: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @hasMany(() => ProficiencyLevel, {
    foreignKey: 'scale_id',
  })
  declare levels: HasMany<typeof ProficiencyLevel>
}
