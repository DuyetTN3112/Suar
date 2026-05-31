import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import TaskRequirementVersionItem from './task_requirement_version_item.js'

export type RequirementVersionReason =
  | 'task_created'
  | 'task_assigned'
  | 'submission_sent'
  | 'review_started'
  | 'dispute_opened'
  | 'manual_edit'

export default class TaskRequirementVersion extends BaseModel {
  static override table = 'task_requirement_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare version_number: number

  @column()
  declare reason: RequirementVersionReason

  @column()
  declare created_by: string | null

  @column()
  declare professional_role_snapshot: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @hasMany(() => TaskRequirementVersionItem, {
    foreignKey: 'requirement_version_id',
  })
  declare items: HasMany<typeof TaskRequirementVersionItem>
}
