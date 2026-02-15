import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Task from './task.js'
import TaskStatus from './task_status.js'
import TaskLabel from './task_label.js'
import TaskPriority from './task_priority.js'

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

  @column()
  declare status_id: string

  @column()
  declare label_id: string

  @column()
  declare priority_id: string

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
