import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Organization from './organization.js'
import TaskStatus from './task_status.js'

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

  // ===== Static query methods =====

  /**
   * Find all transitions for an organization, preloading from/to statuses.
   */
  static async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskWorkflowTransition[]> {
    return this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .preload('fromStatus')
      .preload('toStatus')
  }

  /**
   * Find allowed transitions from a specific status within an organization.
   */
  static async findFromStatus(
    organizationId: DatabaseId,
    fromStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskWorkflowTransition[]> {
    return this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .where('from_status_id', fromStatusId)
      .preload('toStatus')
  }

  /**
   * Delete all transitions for an organization (used when resetting workflow).
   */
  static async deleteByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .delete()
  }
}
