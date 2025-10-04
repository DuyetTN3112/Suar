import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_STATUS_OPTIONS } from '#modules/projects/public_contracts/project_constants'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof organizationPublicApi.listUserOwnedOrganizations>>
  organizationMembersByOrg: Record<
    string,
    Awaited<ReturnType<typeof organizationPublicApi.getUsersInOrganization>>
  >
  statuses: { id: string; name: string; value: string; label: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ProjectActionContext) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await organizationPublicApi.listUserOwnedOrganizations(userId)
    const organizationMemberEntries: Array<
      [string, Awaited<ReturnType<typeof organizationPublicApi.getUsersInOrganization>>]
    > = await Promise.all(
      organizations.map(async (organization) => [
        organization.id,
        await organizationPublicApi.getUsersInOrganization(organization.id, userId),
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
