export interface OrganizationPortfolioStatsReader {
  countNonDeletedProjectsByOrganizationIds(
    organizationIds: string[]
  ): Promise<Map<string, number>>

  countNonDeletedTasksByOrganization(organizationId: string): Promise<number>

  loadProjectDashboardStats(
    organizationId: string,
    actorId: string
  ): Promise<{
    total: number
    active: number
    completed: number
  }>

  loadTaskDashboardStats(
    organizationId: string,
    actorId: string
  ): Promise<{
    total: number
    inProgress: number
    completed: number
    overdue: number
  }>
}
