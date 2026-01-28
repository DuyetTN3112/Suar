import { projectsSearchComposition } from '#composition/projects_search_composition'
import { makeGetTaskStatisticsQuery } from '#composition/task_action_factory'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/directory/actions/ports/outbound/organization_portfolio_stats_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as taskAggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'

export class OrganizationPortfolioStatsAdapter implements OrganizationPortfolioStatsReader {
  countNonDeletedProjectsByOrganizationIds(
    organizationIds: string[]
  ): Promise<Map<string, number>> {
    return projectModelQueries.countByOrgIds(organizationIds)
  }

  async countNonDeletedTasksByOrganization(organizationId: string): Promise<number> {
    const projectIds = await projectModelQueries.findIdsByOrganization(organizationId)
    const taskCounts = await taskAggregateQueries.countByProjectIds(projectIds)

    let total = 0
    for (const count of taskCounts.values()) {
      total += count
    }
    return total
  }

  async loadProjectDashboardStats(organizationId: string, actorId: string) {
    const result = await projectsSearchComposition.listProjects(
      {
        organization_id: organizationId,
        page: 1,
        limit: 1,
      },
      {
        userId: actorId,
        organizationId,
        ip: '0.0.0.0',
        userAgent: 'organization-dashboard',
      }
    )

    return {
      total: result.stats.total_projects,
      active: result.stats.active_projects,
      completed: result.stats.completed_projects,
    }
  }

  async loadTaskDashboardStats(organizationId: string, actorId: string) {
    const result = await makeGetTaskStatisticsQuery({
      userId: actorId,
      organizationId,
      ip: '0.0.0.0',
      userAgent: 'organization-dashboard',
    }).execute(organizationId)

    return {
      total: result.total,
      inProgress: result.byStatus[TaskStatus.IN_PROGRESS] ?? 0,
      completed: result.byStatus[TaskStatus.DONE] ?? 0,
      overdue: result.overdue,
    }
  }
}
