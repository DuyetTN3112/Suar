import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskStatus from '#models/task_status'

/**
 * TaskStatusRepository
 *
 * Data access for TaskStatus entities.
 * Extracted from TaskStatus model static methods.
 */
export default class TaskStatusRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskStatusRepository().__instanceMarker
  }

  /**
   * Find all active (non-deleted) statuses for an organization, ordered by sort_order.
   */
  static async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus[]> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    return query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
  }

  /**
   * Find the default status for an organization (is_default = true).
   */
  static async findDefault(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    return query
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
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    return query
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
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const q = query
      .where('organization_id', organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')

    if (excludeId) {
      void q.whereNot('id', excludeId)
    }

    const result = await q.first()
    return result !== null
  }

  /**
   * Find a status by ID within a specific organization (validates ownership).
   */
  static async findByIdAndOrg(
    statusId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    return query
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()
  }

  /**
   * Find a status by ID within a specific organization, locking for update.
   */
  static async findByIdAndOrgForUpdate(
    statusId: DatabaseId,
    organizationId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<TaskStatus | null> {
    return TaskStatus.query({ client: trx })
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .forUpdate()
      .first()
  }

  /**
   * Verify a status ID belongs to an organization (no soft-delete filter).
   * Used when loading status by ID for update operations.
   */
  static async findByIdAndOrgActive(
    statusId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatus | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    return query
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()
  }

  /**
   * Unset is_default for all statuses in an organization.
   * Used before setting a new default.
   */
  static async unsetDefaults(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    await query
      .where('organization_id', organizationId)
      .where('is_default', true)
      .whereNull('deleted_at')
      .update({ is_default: false })
  }

  static async create(
    data: Partial<TaskStatus>,
    trx?: TransactionClientContract
  ): Promise<TaskStatus> {
    return TaskStatus.create(data, trx ? { client: trx } : undefined)
  }

  static async save(status: TaskStatus, trx?: TransactionClientContract): Promise<TaskStatus> {
    if (trx) {
      status.useTransaction(trx)
    }
    await status.save()
    return status
  }
}
