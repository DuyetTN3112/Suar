import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Task from './task.js'
import TaskStatus from './task_status.js'
import TaskLabel from './task_label.js'
import TaskPriority from './task_priority.js'

export default class TaskVersion extends BaseModel {
  static table = 'task_versions'
  static primaryKey = 'id'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare task_id: number

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status_id: number

  @column()
  declare label_id: number

  @column()
  declare priority_id: number

  @column()
  declare assigned_to: number | null

  @column()
  declare changed_by: number

  @column.dateTime()
  declare changed_at: DateTime

  @belongsTo(() => Task, {
    foreignKey: 'task_id',
  })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => TaskStatus, {
    foreignKey: 'status_id',
  })
  declare status: BelongsTo<typeof TaskStatus>

  @belongsTo(() => TaskLabel, {
    foreignKey: 'label_id',
  })
  declare label: BelongsTo<typeof TaskLabel>

  @belongsTo(() => TaskPriority, {
    foreignKey: 'priority_id',
  })
  declare priority: BelongsTo<typeof TaskPriority>

  @belongsTo(() => User, {
    foreignKey: 'assigned_to',
  })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'changed_by',
  })
  declare changer: BelongsTo<typeof User>
}
