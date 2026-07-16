import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import SprintReviewPackage from './sprint_review_package.js'

export default class ProjectSprint extends BaseModel {
  static override table = 'project_sprints'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare project_id: string

  @column()
  declare name: string

  @column()
  declare status: 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

  @column.dateTime()
  declare starts_at: DateTime

  @column.dateTime()
  declare ends_at: DateTime

  @column()
  declare created_by: string

  @column()
  declare closed_by: string | null

  @column.dateTime()
  declare review_opened_at: DateTime | null

  @column.dateTime()
  declare review_closed_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @hasMany(() => SprintReviewPackage, { foreignKey: 'sprint_id' })
  declare review_packages: HasMany<typeof SprintReviewPackage>
}
