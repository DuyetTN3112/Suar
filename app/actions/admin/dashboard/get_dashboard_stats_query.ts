import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'

/**
 * GetDashboardStatsQuery (System Admin)
 *
 * Get system-wide statistics for admin dashboard.
 */

export interface GetDashboardStatsResult {
  users: {
    total: number
    active: number
    suspended: number
    new_this_month: number
  }
  organizations: {
    total: number
    by_plan: {
      free: number
      starter: number
      professional: number
      enterprise: number
    }
    new_this_month: number
  }
  projects: {
    total: number
    active: number
    completed: number
  }
  tasks: {
    total: number
    in_progress: number
    completed: number
  }
}

export default class GetDashboardStatsQuery extends BaseQuery<void, GetDashboardStatsResult> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(): Promise<GetDashboardStatsResult> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Users stats
    const [userTotal, userActive, userSuspended, userNewThisMonth] = await Promise.all([
      db.from('users').count('* as total').whereNull('deleted_at').first(),
      db.from('users').count('* as total').where('status', 'active').whereNull('deleted_at').first(),
      db
        .from('users')
        .count('* as total')
        .where('status', 'suspended')
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])

    // Organizations stats
    const [orgTotal, orgByPlan, orgNewThisMonth] = await Promise.all([
      db.from('organizations').count('* as total').whereNull('deleted_at').first(),
      db
        .from('organizations')
        .select('plan')
        .count('* as count')
        .whereNull('deleted_at')
        .groupBy('plan'),
      db
        .from('organizations')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])

    // Projects stats
    const [projectTotal, projectActive, projectCompleted] = await Promise.all([
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
    ])

    // Tasks stats
    const [taskTotal, taskInProgress, taskCompleted] = await Promise.all([
      db.from('tasks').count('* as total').whereNull('deleted_at').first(),
      db
        .from('tasks')
        .count('* as total')
        .where('status_category', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('tasks')
        .count('* as total')
        .where('status_category', 'done')
        .whereNull('deleted_at')
        .first(),
    ])

    // Build plan counts
    const planCounts = { free: 0, starter: 0, professional: 0, enterprise: 0 }
    for (const row of orgByPlan) {
      if (row.plan in planCounts) {
        planCounts[row.plan as keyof typeof planCounts] = Number(row.count)
      }
    }

    return {
      users: {
        total: Number(userTotal?.total || 0),
        active: Number(userActive?.total || 0),
        suspended: Number(userSuspended?.total || 0),
        new_this_month: Number(userNewThisMonth?.total || 0),
      },
      organizations: {
        total: Number(orgTotal?.total || 0),
        by_plan: planCounts,
        new_this_month: Number(orgNewThisMonth?.total || 0),
      },
      projects: {
        total: Number(projectTotal?.total || 0),
        active: Number(projectActive?.total || 0),
        completed: Number(projectCompleted?.total || 0),
      },
      tasks: {
        total: Number(taskTotal?.total || 0),
        in_progress: Number(taskInProgress?.total || 0),
        completed: Number(taskCompleted?.total || 0),
      },
    }
  }
}
