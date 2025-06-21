import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskWorkflowTransition from '#models/task_workflow_transition'

/**
 * TaskWorkflowTransitionRepository
 *
 * Data access for TaskWorkflowTransition entities.
 * Extracted from TaskWorkflowTransition model static methods.
 */
export default class TaskWorkflowTransitionRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskWorkflowTransitionRepository().__instanceMarker
  }

  /**
   * Find all transitions for an organization, preloading from/to statuses.
   */
  static async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskWorkflowTransition[]> {
    const query = trx
      ? TaskWorkflowTransition.query({ client: trx })
      : TaskWorkflowTransition.query()
    return query.where('organization_id', organizationId).preload('fromStatus').preload('toStatus')
  }

  /**
   * Find allowed transitions from a specific status within an organization.
   */
  static async findFromStatus(
    organizationId: DatabaseId,
    fromStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskWorkflowTransition[]> {
    const query = trx
      ? TaskWorkflowTransition.query({ client: trx })
      : TaskWorkflowTransition.query()
    return query
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
    const query = trx
      ? TaskWorkflowTransition.query({ client: trx })
      : TaskWorkflowTransition.query()
    await query.where('organization_id', organizationId).delete()
  }

  static async create(
    data: Partial<TaskWorkflowTransition>,
    trx?: TransactionClientContract
  ): Promise<TaskWorkflowTransition> {
    return TaskWorkflowTransition.create(data, trx ? { client: trx } : undefined)
  }
}
