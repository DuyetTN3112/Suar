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

export default class UserPerformanceStat extends BaseModel {
  static override table = 'user_performance_stats'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column.dateTime()
  declare period_start: DateTime | null

  @column.dateTime()
  declare period_end: DateTime | null

  @column()
  declare total_tasks_completed: number

  @column()
  declare total_hours_worked: number

  @column()
  declare avg_quality_score: number | null

  @column()
  declare on_time_delivery_rate: number | null

  @column()
  declare avg_days_early_or_late: number | null

  @column()
  declare performance_score: number | null

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare tasks_by_type: Record<string, number>

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare tasks_by_difficulty: Record<string, number>

  @column({
    prepare: (value: Record<string, number> | null) => JSON.stringify(value ?? {}),
    consume: (value: string | Record<string, number> | null) =>
      parseJsonColumn<Record<string, number>>(value) ?? {},
  })
  declare tasks_by_domain: Record<string, number>

  @column()
  declare tasks_as_lead: number

  @column()
  declare tasks_as_sole_contributor: number

  @column()
  declare tasks_mentoring_others: number

  @column()
  declare longest_on_time_streak: number

  @column()
  declare current_on_time_streak: number

  @column()
  declare self_assessment_accuracy: number | null

  @column.dateTime()
  declare calculated_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
