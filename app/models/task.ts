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
import TaskDifficultyLevel from './task_difficulty_level.js'
import TaskApplication from './task_application.js'
import TaskAssignment from './task_assignment.js'
import TaskRequiredSkill from './task_required_skill.js'

export default class Task extends BaseModel {
  static override table = 'tasks'

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
  declare difficulty_level_id: number | null

  @column()
  declare assigned_to: number | null

  @column()
  declare creator_id: number

  @column()
  declare updated_by: number | null

  @column.dateTime()
  declare due_date: DateTime | null

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

  // Marketplace columns
  @column()
  declare is_public_listing: boolean

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as string[]) : null),
  })
  declare required_skills: string[] | null

  @column()
  declare estimated_budget: number | null

  @column()
  declare external_applications_count: number

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

  @belongsTo(() => TaskDifficultyLevel, { foreignKey: 'difficulty_level_id' })
  declare difficulty_level: BelongsTo<typeof TaskDifficultyLevel>

  @hasMany(() => TaskApplication, { foreignKey: 'task_id' })
  declare applications: HasMany<typeof TaskApplication>

  @hasMany(() => TaskAssignment, { foreignKey: 'task_id' })
  declare assignments: HasMany<typeof TaskAssignment>

  @hasMany(() => TaskRequiredSkill, { foreignKey: 'task_id' })
  declare required_skills_rel: HasMany<typeof TaskRequiredSkill>

  /**
   * Tùy chỉnh cách serialization của các trường DateTime
   */
  override serialize() {
    return {
      ...this.serializeAttributes(),
      ...this.serializeRelations(),
      created_at: this.created_at.toISO(),
      updated_at: this.updated_at.toISO(),
      due_date: this.due_date ? this.due_date.toISO() : null,
      deleted_at: this.deleted_at ? this.deleted_at.toISO() : null,
    }
  }
}
