import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProfessionalRoleTemplateSkill from '#modules/skills/infra/models/professional_role_template_skill'

export default class ProfessionalRoleTemplate extends BaseModel {
  static override table = 'professional_role_templates'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare is_active: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @hasMany(() => ProfessionalRoleTemplateSkill, {
    foreignKey: 'role_template_id',
  })
  declare template_skills: HasMany<typeof ProfessionalRoleTemplateSkill>
}
