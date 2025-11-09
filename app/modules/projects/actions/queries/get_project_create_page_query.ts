import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof organizationPublicApi.listUserOwnedOrganizations>>
  statuses: { id: string; name: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ProjectActionContext) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await organizationPublicApi.listUserOwnedOrganizations(userId)

    return {
      organizations,
      statuses: [],
    }
  }
}
