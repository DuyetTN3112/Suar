import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'


import ProjectSprint from './project_sprint.js'
import SprintEnvironmentReview from './sprint_environment_review.js'
import SprintManagerReview from './sprint_manager_review.js'

export default class SprintReviewPackage extends BaseModel {
  static override table = 'sprint_review_packages'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare sprint_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare status: 'pending' | 'submitted' | 'expired'

  @column.dateTime()
  declare submitted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ProjectSprint, { foreignKey: 'sprint_id' })
  declare sprint: BelongsTo<typeof ProjectSprint>

  @hasMany(() => SprintManagerReview, { foreignKey: 'package_id' })
  declare manager_reviews: HasMany<typeof SprintManagerReview>

  @hasMany(() => SprintEnvironmentReview, { foreignKey: 'package_id' })
  declare environment_reviews: HasMany<typeof SprintEnvironmentReview>
}
