import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Task from './task.js'

import User from '#infra/users/models/user'

/**
 * TaskAssignment Model
 *
 * Represents task assignments to users.
 *
 * Assignment types:
 * - member: Organization member
 * - freelancer: External hired freelancer
 * - volunteer: Volunteer contributor
 */
export default class TaskAssignment extends BaseModel {
  static override table = 'task_assignments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare assignee_id: string

  @column()
  declare assigned_by: string

  @column()
  declare assignment_type: 'member' | 'freelancer' | 'volunteer'

  @column()
  declare assignment_status: 'active' | 'completed' | 'cancelled'

  @column()
  declare estimated_hours: number | null

  @column()
  declare actual_hours: number | null

  @column()
  declare progress_percentage: number

  @column()
  declare completion_notes: string | null

  @column()
  declare verified_by: string | null

  @column.dateTime()
  declare verified_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare assigned_at: DateTime

  @column.dateTime()
  declare completed_at: DateTime | null

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'assignee_id' })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assigned_by' })
  declare assigner: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'verified_by' })
  declare verifier: BelongsTo<typeof User>
}
