/**
 * Cross-domain admin aggregation boundary.
 *
 * This file may compose admin read models across domains, but it must not import
 * module-private infra paths. Prefer module public APIs or SQL projections for
 * joined dashboard reads.
 */
import db from '@adonisjs/lucid/services/db'

import type {
  AdminTaskStats,
  AdminTaskStatsRepository,
} from '#modules/admin/dashboard/actions/ports/outbound/admin_operational_repository'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const AdminTaskReadOps: AdminTaskStatsRepository = {
  async getTaskStats(): Promise<AdminTaskStats> {
    const statsResults = (await Promise.all([
      db.from('tasks').count('* as total').whereNull('deleted_at').first(),
      db
        .from('tasks')
        .count('* as total')
        .whereIn('status', ['in_progress', 'in_review'])
        .whereNull('deleted_at')
        .first(),
      db.from('tasks').count('* as total').where('status', 'done').whereNull('deleted_at').first(),
    ])) as unknown[]

    const total = statsResults[0]
    const inProgress = statsResults[1]
    const completed = statsResults[2]

    return {
      total: isRecord(total) ? toNumberValue(total['total']) : 0,
      inProgress: isRecord(inProgress) ? toNumberValue(inProgress['total']) : 0,
      completed: isRecord(completed) ? toNumberValue(completed['total']) : 0,
    }
  },
}
