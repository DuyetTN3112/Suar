import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskStatus from '#modules/tasks/infra/models/task-status/task_status'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

function toTaskStatusRecord(model: TaskStatus): TaskStatusRecord {
  return {
    id: model.id,
    organization_id: model.organization_id,
    project_id: model.project_id,
    name: model.name,
    slug: model.slug,
    category: model.category,
    color: model.color,
    icon: model.icon,
    description: model.description,
    sort_order: model.sort_order,
    is_default: model.is_default,
    is_system: model.is_system,
    created_at: serializeDateTime(model.created_at),
    updated_at: serializeDateTime(model.updated_at),
    deleted_at: serializeDateTime(model.deleted_at),
  }
}

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
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord[]> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const models = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return models.map(toTaskStatusRecord)
  }

  /** Find active statuses owned by one project, in board-column order. */
  static async findByProject(
    projectId: string,
    trx?: TransactionClientContract,
    organizationId?: string
  ): Promise<TaskStatusRecord[]> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const scopedQuery = query
      .where('project_id', projectId)
      .whereNull('deleted_at')
    if (organizationId) {
      void scopedQuery.where('organization_id', organizationId)
    }
    const models = await scopedQuery.orderBy('sort_order', 'asc')
    return models.map(toTaskStatusRecord)
  }

  /**
   * Find the default status for an organization (is_default = true).
   */
  static async findDefault(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const model = await query
      .where('organization_id', organizationId)
      .where('is_default', true)
      .whereNull('deleted_at')
      .first()
    return model ? toTaskStatusRecord(model) : null
  }

  /**
   * Find status by slug within an organization.
   */
  static async findBySlug(
    organizationId: string,
    slug: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const model = await query
      .where('organization_id', organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')
      .first()
    return model ? toTaskStatusRecord(model) : null
  }

  /**
   * Check if a slug is already in use within an organization.
   */
  static async slugExists(
    organizationId: string,
    slug: string,
    excludeId?: string,
    trx?: TransactionClientContract,
    projectId?: string
  ): Promise<boolean> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const q = query
      .where('organization_id', organizationId)
      .where('slug', slug)
      .whereNull('deleted_at')

    if (excludeId) {
      void q.whereNot('id', excludeId)
    }
    if (projectId) {
      void q.where('project_id', projectId)
    }

    const result = await q.first()
    return result !== null
  }

  /**
   * Find a status by ID within a specific organization (validates ownership).
   */
  static async findByIdAndOrg(
    statusId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const model = await query
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()
    return model ? toTaskStatusRecord(model) : null
  }

  /**
   * Find a status by ID within a specific organization, locking for update.
   */
  static async findByIdAndOrgForUpdate(
    statusId: string,
    organizationId: string,
    trx: TransactionClientContract,
    projectId?: string
  ): Promise<TaskStatusRecord | null> {
    const query = TaskStatus.query({ client: trx })
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
    if (projectId) {
      void query.where('project_id', projectId)
    }
    const model = await query.forUpdate().first()
    return model ? toTaskStatusRecord(model) : null
  }

  /**
   * Verify a status ID belongs to an organization (no soft-delete filter).
   * Used when loading status by ID for update operations.
   */
  static async findByIdAndOrgActive(
    statusId: string,
    organizationId: string,
    trx?: TransactionClientContract,
    projectId?: string
  ): Promise<TaskStatusRecord | null> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const scopedQuery = query
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
    if (projectId) {
      void scopedQuery.where('project_id', projectId)
    }
    const status = await scopedQuery.first()

    return status ? toTaskStatusRecord(status) : null
  }

  /**
   * Unset is_default for all statuses in an organization.
   * Used before setting a new default.
   */
  static async unsetDefaults(
    organizationId: string,
    trx?: TransactionClientContract,
    projectId?: string
  ): Promise<void> {
    const query = trx ? TaskStatus.query({ client: trx }) : TaskStatus.query()
    const scopedQuery = query
      .where('organization_id', organizationId)
      .where('is_default', true)
      .whereNull('deleted_at')
    if (projectId) {
      void scopedQuery.where('project_id', projectId)
    }
    await scopedQuery.update({
        is_default: false,
        updated_at: new Date(),
      })
  }

  static async create(
    data: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord> {
    const status = await TaskStatus.create(data, trx ? { client: trx } : undefined)
    return toTaskStatusRecord(status)
  }

  static async save(status: TaskStatus, trx?: TransactionClientContract): Promise<TaskStatus> {
    if (trx) {
      status.useTransaction(trx)
    }
    await status.save()
    return status
  }

  static async update(
    statusId: string,
    organizationId: string,
    data: Record<string, unknown>,
    trx: TransactionClientContract,
    projectId?: string
  ): Promise<TaskStatusRecord> {
    const query = TaskStatus.query({ client: trx })
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
    if (projectId) {
      void query.where('project_id', projectId)
    }
    const status = await query.forUpdate().firstOrFail()
      
    status.merge(data)
    await status.save()
    return toTaskStatusRecord(status)
  }

  static async softDelete(
    statusId: string,
    organizationId: string,
    trx: TransactionClientContract,
    projectId?: string
  ): Promise<void> {
    const { DateTime } = await import('luxon')
    const query = TaskStatus.query({ client: trx })
      .where('id', statusId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
    if (projectId) {
      void query.where('project_id', projectId)
    }
    const status = await query.forUpdate().firstOrFail()
      
    status.deleted_at = DateTime.now()
    await status.save()
  }
}
