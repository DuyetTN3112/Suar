import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import TaskVersion from './task_version.js'
import Organization from './organization.js'
import Project from './project.js'
import TaskApplication from './task_application.js'
import TaskAssignment from './task_assignment.js'
import TaskRequiredSkill from './task_required_skill.js'
import TaskStatusModel from './task_status.js'

export default class Task extends BaseModel {
  static override table = 'tasks'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare description: string

  /**
   * v3.0: Inline status VARCHAR — replaces status_id UUID → task_status table
   * CHECK: 'todo', 'in_progress', 'done', 'cancelled', 'in_review'
   * Phase 4 note: Use task_status_id FK during migration rollout.
   */
  @column()
  declare status: string

  /**
   * v4.0: FK to task_statuses table (per-org configurable statuses).
   * Nullable during migration — old tasks may not have this set yet.
   */
  @column()
  declare task_status_id: string | null

  /**
   * v3.0: Inline label VARCHAR — replaces label_id UUID → task_labels table
   * CHECK: 'bug', 'feature', 'enhancement', 'documentation'
   */
  @column()
  declare label: string

  /**
   * v3.0: Inline priority VARCHAR — replaces priority_id UUID → task_priorities table
   * CHECK: 'low', 'medium', 'high', 'urgent'
   */
  @column()
  declare priority: string

  /**
   * v3.0: Inline difficulty VARCHAR — replaces difficulty_level_id UUID → task_difficulty_levels table
   * CHECK: 'easy', 'medium', 'hard', 'expert'
   */
  @column()
  declare difficulty: string | null

  @column()
  declare assigned_to: string | null

  @column()
  declare creator_id: string

  @column()
  declare updated_by: string | null

  @column.dateTime()
  declare due_date: DateTime | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column()
  declare parent_task_id: string | null

  @column()
  declare estimated_time: number

  @column()
  declare actual_time: number

  @column()
  declare organization_id: string // v3.0: NOT NULL

  @column()
  declare project_id: string | null

  // Marketplace columns
  @column()
  declare task_visibility: string

  @column.dateTime()
  declare application_deadline: DateTime | null

  // v3.0: required_skills JSONB REMOVED — single source: task_required_skills table

  @column()
  declare estimated_budget: number | null

  @column()
  declare external_applications_count: number

  @column()
  declare sort_order: number

  // ===== Relationships =====

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

  @hasMany(() => TaskVersion, {
    foreignKey: 'task_id',
    localKey: 'id',
  })
  declare versions: HasMany<typeof TaskVersion>

  @hasMany(() => TaskApplication, { foreignKey: 'task_id' })
  declare applications: HasMany<typeof TaskApplication>

  @hasMany(() => TaskAssignment, { foreignKey: 'task_id' })
  declare assignments: HasMany<typeof TaskAssignment>

  @hasMany(() => TaskRequiredSkill, { foreignKey: 'task_id' })
  declare required_skills_rel: HasMany<typeof TaskRequiredSkill>

  @belongsTo(() => TaskStatusModel, { foreignKey: 'task_status_id' })
  declare taskStatus: BelongsTo<typeof TaskStatusModel>
}
