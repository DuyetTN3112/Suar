import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'

/**
 * GetOrganizationDashboardStatsQuery (Organization Admin)
 *
 * Get organization-specific statistics for org admin dashboard.
 */

export interface GetOrganizationDashboardStatsDTO {
  organizationId: string
}

export interface GetOrganizationDashboardStatsResult {
  members: {
    total: number
    by_role: {
      org_owner: number
      org_admin: number
      org_member: number
    }
    pending_invitations: number
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
    overdue: number
  }
}

export default class GetOrganizationDashboardStatsQuery extends BaseQuery<
  GetOrganizationDashboardStatsDTO,
  GetOrganizationDashboardStatsResult
> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: GetOrganizationDashboardStatsDTO): Promise<GetOrganizationDashboardStatsResult> {
    const orgId = dto.organizationId

    // Members stats
    const [memberTotal, memberByRole, memberPending] = await Promise.all([
      db
        .from('organization_users')
        .count('* as total')
        .where('organization_id', orgId)
        .where('status', 'approved')
        .first(),
      db
        .from('organization_users')
        .select('org_role')
        .count('* as count')
        .where('organization_id', orgId)
        .where('status', 'approved')
        .groupBy('org_role'),
      db
        .from('organization_users')
        .count('* as total')
        .where('organization_id', orgId)
        .where('status', 'pending')
        .first(),
    ])

    // Projects stats
    const [projectTotal, projectActive, projectCompleted] = await Promise.all([
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', orgId)
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', orgId)
        .where('status', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', orgId)
        .where('status', 'completed')
        .whereNull('deleted_at')
        .first(),
    ])

    // Tasks stats (join with projects to filter by org)
    const now = new Date()
    const [taskTotal, taskInProgress, taskCompleted, taskOverdue] = await Promise.all([
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', orgId)
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', orgId)
        .where('tasks.status_category', 'in_progress')
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', orgId)
        .where('tasks.status_category', 'done')
        .whereNull('tasks.deleted_at')
        .first(),
      db
        .from('tasks')
        .innerJoin('projects', 'tasks.project_id', 'projects.id')
        .count('tasks.id as total')
        .where('projects.organization_id', orgId)
        .where('tasks.due_date', '<', now)
        .whereNotIn('tasks.status_category', ['done', 'cancelled'])
        .whereNull('tasks.deleted_at')
        .first(),
    ])

    // Build role counts
    const roleCounts = { org_owner: 0, org_admin: 0, org_member: 0 }
    for (const row of memberByRole) {
      if (row.org_role in roleCounts) {
        roleCounts[row.org_role as keyof typeof roleCounts] = Number(row.count)
      }
    }

    return {
      members: {
        total: Number(memberTotal?.total || 0),
        by_role: roleCounts,
        pending_invitations: Number(memberPending?.total || 0),
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
        overdue: Number(taskOverdue?.total || 0),
      },
    }
  }
}
