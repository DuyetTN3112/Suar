import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TaskAssignmentAcknowledgementState } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'

export default class TaskAssignmentContractHead extends BaseModel {
  static override table = 'task_assignment_contract_heads'

  @column({ isPrimary: true })
  declare task_assignment_id: string

  @column()
  declare task_id: string

  @column()
  declare current_snapshot_id: string

  @column()
  declare revision: number

  @column()
  declare acknowledgement_state: TaskAssignmentAcknowledgementState

  @column()
  declare expected_snapshot_hash: `sha256:${string}`

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
