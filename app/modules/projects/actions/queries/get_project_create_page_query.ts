import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  ProjectOrganizationReader,
  ProjectOrganizationUserOption,
  ProjectOwnedOrganizationOption,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_STATUS_OPTIONS } from '#modules/projects/public_contracts/project_constants'

export interface GetProjectCreatePageResult {
  organizations: ProjectOwnedOrganizationOption[]
  organizationMembersByOrg: Record<string, ProjectOrganizationUserOption[]>
  statuses: { id: string; name: string; value: string; label: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(
    protected execCtx: ProjectActionContext,
    private readonly organizations: ProjectOrganizationReader
  ) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await this.organizations.listOwnedOrganizations(userId)
    const organizationMemberEntries: Array<[string, ProjectOrganizationUserOption[]]> =
      await Promise.all(
      organizations.map(async (organization) => [
        organization.id,
        await this.organizations.listOrganizationUsers(organization.id, userId),
      ])
    )
    const organizationMembersByOrg: GetProjectCreatePageResult['organizationMembersByOrg'] =
      Object.fromEntries(organizationMemberEntries)

    return {
      organizations,
      organizationMembersByOrg,
      statuses: [...PROJECT_STATUS_OPTIONS],
    }
  }
}
