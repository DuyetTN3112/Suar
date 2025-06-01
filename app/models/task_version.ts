import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import User from './user.js'
import Task from './task.js'

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

  // ===== Fat Model Methods =====

  /**
   * Tạo version snapshot cho task — v3: uses inline strings
   */
  static async createSnapshot(
    data: {
      task_id: DatabaseId
      title: string
      description: string | null
      status: string
      label: string
      priority: string
      difficulty: string | null
      assigned_to: DatabaseId | null
      changed_by: DatabaseId
    },
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.create(
      {
        task_id: String(data.task_id),
        title: data.title,
        description: data.description,
        status: data.status,
        label: data.label,
        priority: data.priority,
        difficulty: data.difficulty,
        assigned_to: data.assigned_to ? String(data.assigned_to) : null,
        changed_by: String(data.changed_by),
      } as Partial<TaskVersion>,
      trx ? { client: trx } : undefined
    )
  }
}
