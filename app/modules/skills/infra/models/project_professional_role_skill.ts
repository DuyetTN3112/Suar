import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProficiencyLevel from '#modules/skills/infra/models/proficiency_level'
import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import ProjectSkill from '#modules/skills/infra/models/project_skill'

export default class ProjectProfessionalRoleSkill extends BaseModel {
  static override table = 'project_professional_role_skills'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare project_professional_role_id: string

  @column()
  declare project_skill_id: string

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

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ProjectProfessionalRole, {
    foreignKey: 'project_professional_role_id',
  })
  declare projectProfessionalRole: BelongsTo<typeof ProjectProfessionalRole>

  @belongsTo(() => ProjectSkill, {
    foreignKey: 'project_skill_id',
  })
  declare projectSkill: BelongsTo<typeof ProjectSkill>

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
