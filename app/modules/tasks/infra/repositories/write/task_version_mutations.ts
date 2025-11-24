import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskVersion from '#modules/tasks/infra/models/task_version'

export async function createSnapshot(
  taskId: string,
  snapshotData: Record<string, unknown>,
  userId: string,
  trx?: TransactionClientContract
): Promise<void> {
  const payload: Partial<TaskVersion> = {
    task_id: taskId,
    title: snapshotData.title as string,
    description: snapshotData.description as string | null,
    status: snapshotData.status as string,
    label: snapshotData.label as string,
    priority: snapshotData.priority as string,
    difficulty: snapshotData.difficulty as string | null,
    assigned_to: snapshotData.assigned_to as string | null,
    changed_by: userId,
  }

  await TaskVersion.create(payload, trx ? { client: trx } : undefined)
}
