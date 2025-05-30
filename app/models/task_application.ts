import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Task from './task.js'
import User from './user.js'

/**
 * TaskApplication Model
 *
 * Represents a freelancer's application to work on a task.
 * Freelancers can apply to public_listing tasks.
 *
 * Application sources:
 * - public_listing: Self-discovered and applied
 * - invitation: Applied after receiving invitation
 * - referral: Applied after being referred
 */
export default class TaskApplication extends BaseModel {
  static override table = 'task_applications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare task_id: number

  @column()
  declare applicant_id: number

  @column()
  declare application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'

  @column()
  declare application_source: 'public_listing' | 'invitation' | 'referral'

  @column()
  declare message: string | null

  @column()
  declare expected_rate: number | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as string[]) : null),
  })
  declare portfolio_links: string[] | null

  @column.dateTime({ autoCreate: true })
  declare applied_at: DateTime

  @column()
  declare reviewed_by: number | null

  @column.dateTime()
  declare reviewed_at: DateTime | null

  @column()
  declare rejection_reason: string | null

  // Relationships
  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'applicant_id' })
  declare applicant: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'reviewed_by' })
  declare reviewer: BelongsTo<typeof User>
}
