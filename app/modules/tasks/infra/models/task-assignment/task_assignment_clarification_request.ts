import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TaskAssignmentClarificationRequest extends BaseModel {
  static override table = 'task_assignment_clarification_requests'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: 'suar.task_assignment_clarification.v1'

  @column()
  declare task_assignment_id: string

  @column()
  declare snapshot_id: string

  @column()
  declare requested_by: string

  @column()
  declare reason: string

  @column()
  declare state: 'open' | 'resolved' | 'cancelled'

  @column()
  declare idempotency_key: string

  @column()
  declare request_hash: `sha256:${string}`

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime()
  declare resolved_at: DateTime | null
}
