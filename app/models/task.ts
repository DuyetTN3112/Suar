import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { TaskStatus, TERMINAL_TASK_STATUSES } from '#constants'
import User from './user.js'
import TaskVersion from './task_version.js'
import Organization from './organization.js'
import Project from './project.js'
import TaskApplication from './task_application.js'
import TaskAssignment from './task_assignment.js'
import TaskRequiredSkill from './task_required_skill.js'

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
   */
  @column()
  declare status: string

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
  declare is_public_listing: boolean

  // v3.0: required_skills JSONB REMOVED — single source: task_required_skills table

  @column()
  declare estimated_budget: number | null

  @column()
  declare external_applications_count: number

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

  @hasMany(() => TaskVersion)
  declare versions: HasMany<typeof TaskVersion>

  @hasMany(() => TaskApplication, { foreignKey: 'task_id' })
  declare applications: HasMany<typeof TaskApplication>

  @hasMany(() => TaskAssignment, { foreignKey: 'task_id' })
  declare assignments: HasMany<typeof TaskAssignment>

  @hasMany(() => TaskRequiredSkill, { foreignKey: 'task_id' })
  declare required_skills_rel: HasMany<typeof TaskRequiredSkill>

  // ===== Static Methods (Fat Model) =====

  /**
   * v3.0: Đếm tasks chưa hoàn thành — dùng inline status string
   */
  static async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotIn('status', TERMINAL_TASK_STATUSES as unknown as string[])
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * Chuyển gán tasks từ một user sang user khác trong project
   * Thay thế: trx.from('tasks').where('project_id', ...).where('assigned_to', fromUserId).update(...)
   */
  static async reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .where('project_id', projectId)
      .where('assigned_to', fromUserId)
      .whereNull('deleted_at')
      .update({
        assigned_to: String(toUserId),
        updated_at: new Date(),
      })
  }

  /**
   * Bỏ gán tất cả tasks của một user trong nhiều projects
   * Thay thế: trx.from('tasks').whereIn('project_id', projectIds).where('assigned_to', userId).update(...)
   */
  static async unassignByUserInProjects(
    projectIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (projectIds.length === 0) return
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .whereIn('project_id', projectIds)
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .update({
        assigned_to: null,
        updated_at: new Date(),
      })
  }

  /**
   * v3.0: Task summary — dùng inline status strings
   */
  static async getTasksSummaryByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const tasks = await query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .select('status', 'due_date')

    const now = new Date()
    let pending = 0
    let inProgress = 0
    let completed = 0
    let overdue = 0

    for (const task of tasks) {
      if (task.status === TaskStatus.TODO) pending++
      else if (task.status === TaskStatus.IN_PROGRESS) inProgress++
      else if (task.status === TaskStatus.DONE) completed++

      // Overdue: not done/cancelled and past due date
      if (
        ![TaskStatus.DONE, TaskStatus.CANCELLED].includes(task.status as TaskStatus) &&
        task.due_date
      ) {
        const dueDate =
          task.due_date instanceof Date ? task.due_date : new Date(String(task.due_date))
        if (dueDate < now) overdue++
      }
    }

    return {
      total: tasks.length,
      pending,
      in_progress: inProgress,
      completed,
      overdue,
    }
  }

  /**
   * Đếm số tasks theo từng assignee trong project
   * Thay thế: db.from('tasks').select('assigned_to').count().where('project_id', ...).groupBy('assigned_to')
   * Return: Map<userId, count>
   */
  static async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    const query = trx ? this.query({ client: trx }) : this.query()
    let q = query
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotNull('assigned_to')
      .select('assigned_to')
      .count('* as total')
      .groupBy('assigned_to')

    if (userIds && userIds.length > 0) {
      q = q.whereIn('assigned_to', userIds)
    }

    const results = await q
    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.assigned_to), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

  /**
   * Count tasks per project for batch enrichment
   * Thay thế: db.from('tasks').select('project_id').count('*').whereIn(...).groupBy(...)
   */
  static async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const query = trx ? this.query({ client: trx }) : this.query()
    const results = await query
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .select('project_id')
      .count('* as total')
      .groupBy('project_id')

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.project_id), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

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
