import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import TaskStatus from './task_status.js'
import TaskLabel from './task_label.js'
import TaskPriority from './task_priority.js'
import TaskVersion from './task_version.js'
import Organization from './organization.js'
import Project from './project.js'

export default class Task extends BaseModel {
  static table = 'tasks'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare status_id: number

  @column()
  declare label_id: number

  @column()
  declare priority_id: number

  @column()
  declare assigned_to: number | null

  @column()
  declare creator_id: number

  @column()
  declare updated_by: number | null

  @column.dateTime()
  declare due_date: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column()
  declare parent_task_id: number | null

  @column()
  declare estimated_time: number

  @column()
  declare actual_time: number

  @column()
  declare organization_id: number

  @column()
  declare project_id: number | null

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
    foreignKey: 'creator_id',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'updated_by',
  })
  declare updater: BelongsTo<typeof User>

  @belongsTo(() => Task, {
    foreignKey: 'parent_task_id',
  })
  declare parentTask: BelongsTo<typeof Task>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @hasMany(() => Task, {
    foreignKey: 'parent_task_id',
  })
  declare childTasks: HasMany<typeof Task>

  @hasMany(() => TaskVersion)
  declare versions: HasMany<typeof TaskVersion>

  /**
   * Tùy chỉnh cách serialization của các trường DateTime
   */
  serialize() {
    return {
      ...this.serializeAttributes(),
      ...this.serializeRelations(),
      created_at: this.created_at ? this.created_at.toISO() : null,
      updated_at: this.updated_at ? this.updated_at.toISO() : null,
      due_date: this.due_date ? this.due_date.toISO() : null,
      deleted_at: this.deleted_at ? this.deleted_at.toISO() : null,
    }
  }
}
