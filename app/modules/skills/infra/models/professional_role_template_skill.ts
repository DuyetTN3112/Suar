import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProfessionalRoleTemplate from '#modules/skills/infra/models/professional_role_template'
import ProficiencyLevel from '#modules/skills/infra/models/proficiency_level'
import Skill from '#modules/skills/infra/models/skill'

export default class ProfessionalRoleTemplateSkill extends BaseModel {
  static override table = 'professional_role_template_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare role_template_id: string

  @column()
  declare skill_id: string

  @column()
  declare minimum_level_id: string | null

  @column()
  declare target_level_id: string | null

  @column()
  declare assessment_ceiling_level_id: string | null

  @column()
  declare is_mandatory: boolean

  @column()
  declare importance: 'low' | 'medium' | 'high' | 'critical'

  @column()
  declare weight: number

  @column()
  declare sort_order: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ProfessionalRoleTemplate, {
    foreignKey: 'role_template_id',
  })
  declare roleTemplate: BelongsTo<typeof ProfessionalRoleTemplate>

  @belongsTo(() => Skill, {
    foreignKey: 'skill_id',
  })
  declare skill: BelongsTo<typeof Skill>

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'minimum_level_id',
  })
  declare minimumLevel: BelongsTo<typeof ProficiencyLevel>

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'target_level_id',
  })
  declare targetLevel: BelongsTo<typeof ProficiencyLevel>

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'assessment_ceiling_level_id',
  })
  declare assessmentCeilingLevel: BelongsTo<typeof ProficiencyLevel>
}
