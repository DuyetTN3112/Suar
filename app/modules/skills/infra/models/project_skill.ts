import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Skill from './skill.js'
import SkillRubricVersion from './skill_rubric_version.js'

export default class ProjectSkill extends BaseModel {
  static override table = 'project_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare project_id: string

  @column()
  declare skill_id: string

  @column()
  declare display_name_override: string | null

  @column()
  declare description_override: string | null

  @column()
  declare rubric_version_id: string | null

  @column()
  declare is_active: boolean

  @column()
  declare is_selectable_for_tasks: boolean

  @column()
  declare is_visible_in_project: boolean

  @column()
  declare added_by: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Skill, {
    foreignKey: 'skill_id',
  })
  declare skill: BelongsTo<typeof Skill>

  @belongsTo(() => SkillRubricVersion, {
    foreignKey: 'rubric_version_id',
  })
  declare rubricVersion: BelongsTo<typeof SkillRubricVersion>
}
