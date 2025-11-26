import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import TaskStatus from './task_status.js'

import Organization from '#infra/organizations/models/organization'

export default class TaskWorkflowTransition extends BaseModel {
  static override table = 'task_workflow_transitions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare from_status_id: string

  @column()
  declare to_status_id: string

  /** Conditions for this transition, e.g. { requires_assignee: true } */
  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value),
    consume: (value: string | Record<string, unknown>): Record<string, unknown> =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value,
  })
  declare conditions: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // ===== Relationships =====

  @belongsTo(() => Organization, { foreignKey: 'organization_id' })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => TaskStatus, { foreignKey: 'from_status_id' })
  declare fromStatus: BelongsTo<typeof TaskStatus>

  @belongsTo(() => TaskStatus, { foreignKey: 'to_status_id' })
  declare toStatus: BelongsTo<typeof TaskStatus>

  // All query methods have been moved to app/repositories/task_workflow_transition_repository.ts.
}
