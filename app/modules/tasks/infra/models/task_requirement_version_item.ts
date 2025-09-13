import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import TaskRequirementVersion from './task_requirement_version.js'

export default class TaskRequirementVersionItem extends BaseModel {
  static override table = 'task_requirement_version_items'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare requirement_version_id: string

  @column()
  declare skill_id: string

  @column()
  declare project_skill_id: string | null

  @column()
  declare minimum_level_id: string | null

  @column()
  declare target_level_id: string | null

  @column()
  declare assessment_ceiling_level_id: string | null

  @column()
  declare rubric_version_id: string | null

  @column()
  declare required_level_code: string | null

  @column()
  declare is_mandatory: boolean

  @column()
  declare importance: 'low' | 'medium' | 'high' | 'critical'

  @column()
  declare weight: number

  @column()
  declare requirement_source: 'manual' | 'professional_role_prefill' | 'template' | 'copied_task' | 'imported_legacy'

  @column()
  declare requirement_notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => TaskRequirementVersion, { foreignKey: 'requirement_version_id' })
  declare version: BelongsTo<typeof TaskRequirementVersion>
}
