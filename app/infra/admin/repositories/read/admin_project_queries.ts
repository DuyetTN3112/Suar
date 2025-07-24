import db from '@adonisjs/lucid/services/db'

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

export interface DashboardProjectStats {
  total: number
  active: number
  completed: number
}

export const AdminProjectReadOps = {
  async getProjectStats(): Promise<DashboardProjectStats> {
    const statsResults = (await Promise.all([
      db.from('projects').count('* as total').whereNull('deleted_at').first(),
      db
        .from('projects')
        .count('* as total')
        .where('status', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('status', 'completed')
        .whereNull('deleted_at')
        .first(),
    ])) as unknown[]

    const total = statsResults[0]
    const active = statsResults[1]
    const completed = statsResults[2]

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      active: isRecord(active) ? toNumberValue(active.total) : 0,
      completed: isRecord(completed) ? toNumberValue(completed.total) : 0,
    }
  },
}
