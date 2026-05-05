import type { ProjectAccessPort } from '#modules/marketplace/actions/ports/outbound/project_access_port'
import type { ProjectOrganizationReader } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import GetMarketplaceProjectAccessQuery from '#modules/projects/actions/queries/marketplace/get_marketplace_project_access_query'

export class MarketplaceProjectAccessAdapter implements ProjectAccessPort {
  private readonly access: GetMarketplaceProjectAccessQuery

  constructor(
    organizationReader: ProjectOrganizationReader,
    projects: ProjectLifecycleRepository,
    memberships: ProjectMembershipRepository
  ) {
    this.access = new GetMarketplaceProjectAccessQuery(
      organizationReader,
      projects,
      memberships
    )
  }

  canViewProjectTasks(projectId: string, userId: string): Promise<boolean> {
    return this.access.handle({
      intent: 'view_tasks',
      projectId,
      userId,
    })
  }

  canManageProjectTasks(projectId: string, userId: string): Promise<boolean> {
    return this.access.handle({
      intent: 'manage_tasks',
      projectId,
      userId,
    })
  }
}
