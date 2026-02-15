import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Task from './task.js'

/**
 * TaskDifficultyLevel Model
 *
 * Difficulty levels for tasks:
 * - Easy (1.0x multiplier)
 * - Medium (1.5x multiplier)
 * - Hard (2.0x multiplier)
 * - Expert (2.5x multiplier)
 */
export default class TaskDifficultyLevel extends BaseModel {
  static override table = 'task_difficulty_levels'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare difficulty_code: string

  @column()
  declare difficulty_name: string

  @column()
  declare multiplier: number

  @column()
  declare description: string | null

  @column()
  declare color_hex: string

  @column()
  declare sort_order: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @hasMany(() => Task, { foreignKey: 'difficulty_level_id' })
  declare tasks: HasMany<typeof Task>
}
