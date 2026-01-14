import type { ProjectOrganizationReader } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'

export type GetMarketplaceProjectAccessInput =
  | { intent: 'view_tasks'; projectId: string; userId: string }
  | { intent: 'manage_tasks'; projectId: string; userId: string }

/**
 * Owns Marketplace's externally driven project-access decision.
 */
export default class GetMarketplaceProjectAccessQuery {
  constructor(
    private readonly organizationReader: ProjectOrganizationReader,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository
  ) {}

  async handle(input: GetMarketplaceProjectAccessInput): Promise<boolean> {
    const project = await this.projects.findDetail(input.projectId)
    if (input.intent === 'view_tasks' && project.visibility === 'public') {
      return true
    }

    const membership = await this.memberships.findMember(input.projectId, input.userId)
    if (membership !== null) {
      return true
    }
    if (input.intent === 'view_tasks') {
      return false
    }

    const actorMembership = await this.organizationReader.getMembershipRole(
      project.organization_id,
      input.userId
    )
    return actorMembership === 'org_owner' || actorMembership === 'org_admin'
  }
}
