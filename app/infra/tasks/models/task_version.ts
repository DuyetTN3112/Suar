import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Task from './task.js'

import User from '#infra/users/models/user'

/**
 * TaskVersion Model (v3)
 *
 * Snapshot of task state at a point in time.
 * status/label/priority/difficulty: inline strings (no more FKs to lookup tables)
 */
export default class TaskVersion extends BaseModel {
  static override table = 'task_versions'
  static override primaryKey = 'id'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  // v3: inline strings replace FK IDs
  @column()
  declare status: string

  @column()
  declare label: string

  @column()
  declare priority: string

  // v3: new column — inline difficulty string
  @column()
  declare difficulty: string | null

  @column()
  declare assigned_to: string | null

  @column()
  declare changed_by: string

  @column.dateTime()
  declare changed_at: DateTime

  @belongsTo(() => Task, {
    foreignKey: 'task_id',
  })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, {
    foreignKey: 'assigned_to',
  })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'changed_by',
  })
  declare changer: BelongsTo<typeof User>
}
