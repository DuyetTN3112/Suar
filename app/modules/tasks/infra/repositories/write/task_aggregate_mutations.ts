import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from '../read/shared.js'


/**
 * Bulk write operations on tasks within a project context.
 * These are aggregate-level mutations that affect multiple task rows at once.
 */

export const reassignByUser = async (
  projectId: string,
  fromUserId: string,
  toUserId: string,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx)
    .where('tasks.project_id', projectId)
    .where('tasks.assigned_to', fromUserId)
    .whereNull('tasks.deleted_at')
    .update({
      assigned_to: toUserId,
      updated_at: new Date(),
    })
}

export const unassignByUserInProjects = async (
  projectIds: string[],
  userId: string,
  trx?: TransactionClientContract
): Promise<void> => {
  if (projectIds.length === 0) {
    return
  }

  await baseQuery(trx)
    .whereIn('tasks.project_id', projectIds)
    .where('tasks.assigned_to', userId)
    .whereNull('tasks.deleted_at')
    .update({
      assigned_to: null,
      updated_at: new Date(),
    })
}
