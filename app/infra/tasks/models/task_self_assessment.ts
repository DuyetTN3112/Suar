import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import TaskAssignment from './task_assignment.js'

import User from '#infra/users/models/user'

export default class TaskSelfAssessment extends BaseModel {
  static override table = 'task_self_assessments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare user_id: string

  @column()
  declare overall_satisfaction: number | null

  @column()
  declare difficulty_felt: string | null

  @column()
  declare confidence_level: number | null

  @column()
  declare what_went_well: string | null

  @column()
  declare what_would_do_different: string | null

  @column()
  declare blockers_encountered: string[]

  @column()
  declare skills_felt_lacking: string[]

  @column()
  declare skills_felt_strong: string[]

  @column.dateTime()
  declare submitted_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => TaskAssignment, { foreignKey: 'task_assignment_id' })
  declare taskAssignment: BelongsTo<typeof TaskAssignment>

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
