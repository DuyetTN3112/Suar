import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

const parseJsonColumn = <T>(value: string | T | null): T | null => {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value) as T
}

export default class UserWorkHistory extends BaseModel {
  static override table = 'user_work_history'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare task_id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare organization_id: string | null

  @column()
  declare project_id: string | null

  @column()
  declare task_title: string

  @column()
  declare task_type: string | null

  @column()
  declare business_domain: string | null

  @column()
  declare problem_category: string | null

  @column()
  declare role_in_task: string | null

  @column()
  declare autonomy_level: string | null

  @column()
  declare collaboration_type: string | null

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value ?? []),
    consume: (value: string | string[] | null) => parseJsonColumn<string[]>(value) ?? [],
  })
  declare tech_stack: string[]

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value ?? []),
    consume: (value: string | string[] | null) => parseJsonColumn<string[]>(value) ?? [],
  })
  declare domain_tags: string[]

  @column()
  declare difficulty: string | null

  @column()
  declare estimated_hours: number | null

  @column()
  declare actual_hours: number | null

  @column()
  declare was_on_time: boolean | null

  @column()
  declare days_early_or_late: number | null

  @column({
    prepare: (value: Array<Record<string, unknown>> | null) => JSON.stringify(value ?? []),
    consume: (value: string | Array<Record<string, unknown>> | null) =>
      parseJsonColumn<Array<Record<string, unknown>>>(value) ?? [],
  })
  declare measurable_outcomes: Array<Record<string, unknown>>

  @column()
  declare estimated_business_value: string | null

  @column({
    prepare: (value: Array<Record<string, unknown>> | null) => JSON.stringify(value ?? []),
    consume: (value: string | Array<Record<string, unknown>> | null) =>
      parseJsonColumn<Array<Record<string, unknown>>>(value) ?? [],
  })
  declare knowledge_artifacts: Array<Record<string, unknown>>

  @column()
  declare overall_quality_score: number | null

  @column({
    prepare: (value: Array<Record<string, unknown>> | null) => JSON.stringify(value ?? []),
    consume: (value: string | Array<Record<string, unknown>> | null) =>
      parseJsonColumn<Array<Record<string, unknown>>>(value) ?? [],
  })
  declare skill_scores: Array<Record<string, unknown>>

  @column({
    prepare: (value: Array<Record<string, unknown>> | null) => JSON.stringify(value ?? []),
    consume: (value: string | Array<Record<string, unknown>> | null) =>
      parseJsonColumn<Array<Record<string, unknown>>>(value) ?? [],
  })
  declare evidence_links: Array<Record<string, unknown>>

  @column()
  declare is_featured: boolean

  @column()
  declare is_public: boolean

  @column.dateTime()
  declare completed_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
