import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskVersion from '#models/task_version'

/**
 * TaskVersionRepository
 *
 * Data access for task version snapshots.
 * Extracted from TaskVersion model static methods.
 */
export default class TaskVersionRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskVersionRepository().__instanceMarker
  }

  static async createSnapshot(
    data: {
      task_id: DatabaseId
      title: string
      description: string | null
      status: string
      label: string
      priority: string
      difficulty: string | null
      assigned_to: DatabaseId | null
      changed_by: DatabaseId
    },
    trx?: TransactionClientContract
  ): Promise<void> {
    const payload: Partial<TaskVersion> = {
      task_id: data.task_id,
      title: data.title,
      description: data.description,
      status: data.status,
      label: data.label,
      priority: data.priority,
      difficulty: data.difficulty,
      assigned_to: data.assigned_to ?? null,
      changed_by: data.changed_by,
    }

    await TaskVersion.create(payload, trx ? { client: trx } : undefined)
  }
}
