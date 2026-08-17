import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Task from '../task-authoring/task.js'

/**
 * TaskRequiredSkill Model (Phase 7)
 *
 * Semantic skill requirement: minimum/target/ceiling level IDs,
 * rubric version, importance, weight, requirement source.
 */
export default class TaskRequiredSkill extends BaseModel {
  static override table = 'task_required_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare skill_id: string

  // Phase 7 — project catalog link
  @column()
  declare project_skill_id: string | null

  // Phase 7 — professional role source tracking
  @column()
  declare source_project_professional_role_id: string | null

  @column()
  declare source_role_skill_id: string | null

  // Phase 7 — semantic level IDs (replaces required_public_proficiency_code semantically)
  @column()
  declare minimum_level_id: string | null

  @column()
  declare target_level_id: string | null

  @column()
  declare assessment_ceiling_level_id: string | null

  // Phase 7 — rubric binding
  @column()
  declare rubric_version_id: string | null

  @column()
  declare required_public_proficiency_code: string

  // Phase 7 — proficiency level bridge (added by migration 20260611131056)
  @column()
  declare proficiency_level_id: string | null

  @column()
  declare is_mandatory: boolean

  // Phase 7 — weighting and importance
  @column()
  declare importance: 'low' | 'medium' | 'high' | 'critical'

  @column()
  declare weight: number

  // Phase 7 — source metadata
  @column()
  declare requirement_source: 'manual' | 'professional_role_prefill' | 'template' | 'copied_task' | 'imported_legacy'

  @column()
  declare requirement_notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

}
