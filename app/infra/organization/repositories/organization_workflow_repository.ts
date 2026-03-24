import TaskStatus from '#models/task_status'
import type { DatabaseId } from '#types/database'

/**
 * OrganizationWorkflowRepository (Infrastructure Layer)
 *
 * Handles all database queries for organization workflow/task status management.
 */

export interface TaskStatusData {
  id: string
  name: string
  color: string
  order: number
  is_default: boolean
}

export interface CreateTaskStatusData {
  name: string
  color: string
}

export default class OrganizationWorkflowRepository {
  /**
   * List all task statuses for an organization
   */
  async listTaskStatuses(organizationId: DatabaseId): Promise<TaskStatusData[]> {
    const statuses = await TaskStatus.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')

    return statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      order: status.sort_order,
      is_default: status.is_default,
    }))
  }

  /**
   * Create a new task status
   */
  async createTaskStatus(
    organizationId: DatabaseId,
    data: CreateTaskStatusData
  ): Promise<TaskStatus> {
    // Get the current max sort order
    const maxOrderResult = await TaskStatus.query()
      .where('organization_id', organizationId)
      .max('sort_order as max_order')
      .first()

    const maxOrder = Number(maxOrderResult?.$extras?.max_order || 0)

    const status = await TaskStatus.create({
      organization_id: organizationId,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      category: 'in_progress',
      color: data.color,
      sort_order: maxOrder + 1,
      is_default: false,
      is_system: false,
    })

    return status
  }

  /**
   * Delete a task status
   */
  async deleteTaskStatus(id: DatabaseId): Promise<void> {
    const status = await TaskStatus.findOrFail(id)

    // Soft delete
    status.deleted_at = new Date() as any
    await status.save()
  }
}
