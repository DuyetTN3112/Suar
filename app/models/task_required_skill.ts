import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Task from './task.js'
import Skill from './skill.js'
import ProficiencyLevel from './proficiency_level.js'

/**
 * TaskRequiredSkill Model
 *
 * Skills required for a task with minimum proficiency level.
 * Used for:
 * - Matching freelancers to tasks
 * - Displaying requirements on public listings
 * - Filtering applications based on skills
 */
export default class TaskRequiredSkill extends BaseModel {
  static override table = 'task_required_skills'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare task_id: number

  @column()
  declare skill_id: number

  @column()
  declare required_level_id: number

  @column()
  declare is_mandatory: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => Skill, { foreignKey: 'skill_id' })
  declare skill: BelongsTo<typeof Skill>

  @belongsTo(() => ProficiencyLevel, { foreignKey: 'required_level_id' })
  declare required_level: BelongsTo<typeof ProficiencyLevel>
}
