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
    await TaskVersion.create(
      {
        task_id: data.task_id,
        title: data.title,
        description: data.description,
        status: data.status,
        label: data.label,
        priority: data.priority,
        difficulty: data.difficulty,
        assigned_to: data.assigned_to ?? null,
        changed_by: data.changed_by,
      } as Partial<TaskVersion>,
      trx ? { client: trx } : undefined
    )
  }
}
