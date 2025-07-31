import { organizationPublicApi } from '#actions/organizations/public_api'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof organizationPublicApi.listUserOwnedOrganizations>>
  statuses: { id: string; name: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ExecutionContext) {}

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
