import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Project from '../project-context/project.js'


export default class ProjectMember extends BaseModel {
  static override table = 'project_members'

  // Composite Primary Key - Lucid treats both as primary
  @column({ isPrimary: true })
  declare project_id: string

  @column({ isPrimary: true })
  declare user_id: string

  // v3: inline string instead of FK to project_roles table
  @column()
  declare project_role: string

  @column()
  declare project_professional_role_id: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>
}
