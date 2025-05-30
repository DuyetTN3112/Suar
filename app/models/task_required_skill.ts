import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Task from './task.js'
import Skill from './skill.js'

/**
 * TaskRequiredSkill Model (v3)
 *
 * Skills required for a task with minimum proficiency level.
 * required_level_code: inline proficiency level string (replaces required_level_id FK)
 */
export default class TaskRequiredSkill extends BaseModel {
  static override table = 'task_required_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare skill_id: string

  // v3: inline level code replaces required_level_id FK
  @column()
  declare required_level_code: string

  @column()
  declare is_mandatory: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => Skill, { foreignKey: 'skill_id' })
  declare skill: BelongsTo<typeof Skill>
}
