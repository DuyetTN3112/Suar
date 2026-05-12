import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from './user.js'

const parseJsonColumn = <T>(value: string | T | null): T | null => {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value) as T
}

export default class UserDomainExpertise extends BaseModel {
  static override table = 'user_domain_expertise'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare tech_stack_frequency: Record<string, number>

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare domain_frequency: Record<string, number>

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare problem_category_frequency: Record<string, number>

  @column({
    prepare: (value: Record<string, unknown>[] | null) => JSON.stringify(value ?? []),
    consume: (value: string | Record<string, unknown>[] | null) =>
      parseJsonColumn<Record<string, unknown>[]>(value) ?? [],
  })
  declare top_skills: Record<string, unknown>[]

  @column.dateTime()
  declare calculated_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
