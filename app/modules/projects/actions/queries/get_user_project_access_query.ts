import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import type { ProjectOrganizationReader } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import {
  canUpdateProject,
  canViewProject,
} from '#modules/projects/domain/project_permission_policy'

export interface GetUserProjectAccessInput {
  projectId: string
  userId: string
  organizationId: string
  writeMode?: boolean
}

/**
 * Inbound query for consumers that need a project access decision.
 */
export default class GetUserProjectAccessQuery {
  constructor(
    private readonly organizationReader: ProjectOrganizationReader,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository
  ) {}

  async handle(input: GetUserProjectAccessInput): Promise<void> {
    const project = await this.projects.findDetail(input.projectId)

    if (project.organization_id !== input.organizationId) {
      throw new BusinessLogicException(
        'Access denied: Project does not belong to your current organization'
      )
    }

    const [actorMembership, actorProjectRole] = await Promise.all([
      this.organizationReader.getMembershipRole(input.organizationId, input.userId),
      this.memberships
        .getRoleName(input.projectId, input.userId)
        .then((role) => (role === 'unknown' ? null : role)),
    ])

    const permissionContext = {
      actorId: input.userId,
      actorOrgRole: actorMembership,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectOwnerId: project.owner_id ?? '',
      projectOrganizationId: project.organization_id,
    }

    enforcePolicy(
      input.writeMode ? canUpdateProject(permissionContext) : canViewProject(permissionContext)
    )
  }
}
