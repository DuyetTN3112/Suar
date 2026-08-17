import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export default class TaskAssignmentAcknowledgement extends BaseModel {
  static override table = 'task_assignment_acknowledgements'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: 'suar.task_assignment_acknowledgement.v1'

  @column()
  declare task_assignment_id: string

  @column()
  declare snapshot_id: string

  @column()
  declare assignee_id: string

  @column()
  declare snapshot_hash: `sha256:${string}`

  @column()
  declare idempotency_key: string

  @column()
  declare request_hash: `sha256:${string}`

  @column.dateTime()
  declare acknowledged_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventAcknowledgementMutation(): never {
    throw new InvariantViolationException('Task assignment acknowledgements are immutable facts')
  }
}
