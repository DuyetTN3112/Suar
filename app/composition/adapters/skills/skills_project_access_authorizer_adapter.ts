import type {
  ProjectOrganizationReader,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import GetUserProjectAccessQuery from '#modules/projects/actions/queries/project-members/get_user_project_access_query'
import {
  SkillProjectAccessAuthorizer,
  type SkillProjectAccessInput,
} from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'

export class SkillsProjectAccessAuthorizerAdapter extends SkillProjectAccessAuthorizer {
  private readonly access: GetUserProjectAccessQuery

  constructor(
    organizationReader: ProjectOrganizationReader,
    projects: ProjectLifecycleRepository,
    memberships: ProjectMembershipRepository
  ) {
    super()
    this.access = new GetUserProjectAccessQuery(organizationReader, projects, memberships)
  }

  enforce(input: SkillProjectAccessInput): Promise<void> {
    return this.access.handle(input)
  }
}
