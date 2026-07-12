import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import SprintReviewPackage from './sprint_review_package.js'

export default class SprintManagerReview extends BaseModel {
  static override table = 'sprint_manager_reviews'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare package_id: string

  @column()
  declare target_user_id: string

  @column()
  declare target_role: 'manager' | 'lead' | 'assigner' | 'owner'

  @column()
  declare rating: number

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value,
  })
  declare dimensions: Record<string, unknown> | null

  @column()
  declare comment: string | null

  @column()
  declare is_anonymous_to_target: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => SprintReviewPackage, { foreignKey: 'package_id' })
  declare review_package: BelongsTo<typeof SprintReviewPackage>

}
