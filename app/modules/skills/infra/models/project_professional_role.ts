import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProfessionalRoleTemplate from './professional_role_template.js'
import ProjectProfessionalRoleSkill from './project_professional_role_skill.js'

export default class ProjectProfessionalRole extends BaseModel {
  static override table = 'project_professional_roles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare project_id: string

  @column()
  declare source_template_id: string | null

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare is_active: boolean

  @column()
  declare version: number

  @column()
  declare created_by: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ProfessionalRoleTemplate, {
    foreignKey: 'source_template_id',
  })
  declare sourceTemplate: BelongsTo<typeof ProfessionalRoleTemplate>

  @hasMany(() => ProjectProfessionalRoleSkill, {
    foreignKey: 'project_professional_role_id',
  })
  declare role_skills: HasMany<typeof ProjectProfessionalRoleSkill>
}
