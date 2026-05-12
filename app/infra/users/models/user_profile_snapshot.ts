import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from './user.js'

const parseJsonColumn = <T>(value: string | T | null): T | null => {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value) as T
}

export default class UserProfileSnapshot extends BaseModel {
  static override table = 'user_profile_snapshots'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare version: number

  @column()
  declare snapshot_name: string | null

  @column()
  declare is_current: boolean

  @column()
  declare is_public: boolean

  @column()
  declare shareable_slug: string | null

  @column()
  declare shareable_token: string | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => parseJsonColumn(value),
  })
  declare summary: Record<string, unknown> | null

  @column({
    prepare: (value: unknown[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | unknown[] | null) => parseJsonColumn(value),
  })
  declare skills_verified: unknown[] | null

  @column({
    prepare: (value: unknown[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | unknown[] | null) => parseJsonColumn(value),
  })
  declare work_highlights: unknown[] | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => parseJsonColumn(value),
  })
  declare performance_metrics: Record<string, unknown> | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => parseJsonColumn(value),
  })
  declare trust_metrics: Record<string, unknown> | null

  @column()
  declare scoring_version: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
