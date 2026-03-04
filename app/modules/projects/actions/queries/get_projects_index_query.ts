import type GetProjectsListQuery from './get_projects_list_query.js'

import { canAccessOrganizationAdminShell } from '#modules/organizations/access/public_contracts/organization_access'
import type { ProjectOrganizationReader } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type {
  GetProjectsListDTO,
  GetProjectsListResult,
} from '#modules/projects/public_contracts/project_listing'


export type GetProjectsIndexResult =
  | { redirectTo: '/org/projects'; projects: null }
  | { redirectTo: null; projects: GetProjectsListResult }

/**
 * Coordinates the complete projects index intent, including the organization
 * administration routing decision and the project-list query.
 */
export default class GetProjectsIndexQuery {
  constructor(
    private readonly context: ProjectActionContext,
    private readonly organizations: ProjectOrganizationReader,
    private readonly projects: GetProjectsListQuery
  ) {}

  async handle(input: GetProjectsListDTO): Promise<GetProjectsIndexResult> {
    const actorUserId = this.context.userId
    const organizationId = input.organization_id ?? this.context.organizationId
    if (actorUserId && organizationId) {
      const actorOrgRole = await this.organizations.getMembershipRole(
        organizationId,
        actorUserId
      )
      if (
        canAccessOrganizationAdminShell(
          actorOrgRole as 'org_owner' | 'org_admin' | 'org_member' | null
        ).allowed
      ) {
        return { redirectTo: '/org/projects', projects: null }
      }
    }

    return {
      redirectTo: null,
      projects: await this.projects.handle(input),
    }
  }
}
