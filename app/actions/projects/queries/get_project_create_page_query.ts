import GetUserOwnedOrganizationsQuery from '#actions/organizations/queries/get_user_owned_organizations_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof GetUserOwnedOrganizationsQuery.execute>>
  statuses: { id: string; name: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await GetUserOwnedOrganizationsQuery.execute(userId)

    return {
      organizations,
      statuses: [],
    }
  }
}
