import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Organization from './organization.js'

export default class TaskStatus extends BaseModel {
  static override table = 'task_statuses'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  /** System-fixed category: todo | in_progress | done | cancelled */
  @column()
  declare category: string

  @column()
  declare color: string

  @column()
  declare icon: string | null

  @column()
  declare description: string | null

  @column()
  declare sort_order: number

  /** Whether this is the default status for new tasks */
  @column()
  declare is_default: boolean

  /** System statuses cannot be deleted or have category changed */
  @column()
  declare is_system: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  // ===== Relationships =====

  @belongsTo(() => Organization, { foreignKey: 'organization_id' })
  declare organization: BelongsTo<typeof Organization>

  // Note: outgoing/incoming transitions queried via TaskWorkflowTransition model
  // to avoid circular imports between TaskStatus ↔ TaskWorkflowTransition.

  // ===== Static query methods =====

  /**
   * Find all active (non-deleted) statuses for an organization, ordered by sort_order.
   */
  static async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus[]> {
    const query = this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return query
  }

  /**
   * Find the default status for an organization (is_default = true).
   */
  static async findDefault(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus | null> {
    return this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .where('is_default', true)
      .whereNull('deleted_at')
      .first()
  }

  /**
   * Find status by slug within an organization.
   */
  static async findBySlug(
    organizationId: DatabaseId,
    slug: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatus | null> {
    return this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')
      .first()
  }

  /**
   * Check if a slug is already in use within an organization.
   */
  static async slugExists(
    organizationId: DatabaseId,
    slug: string,
    excludeId?: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = this.query(trx ? { client: trx } : {})
      .where('organization_id', organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')

    if (excludeId) {
      void query.whereNot('id', excludeId)
    }

    const result = await query.first()
    return result !== null
  }
}
