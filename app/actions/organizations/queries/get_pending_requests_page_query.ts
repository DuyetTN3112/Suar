import type { ExecutionContext } from '#types/execution_context'
import GetOrganizationBasicInfoQuery from './get_organization_basic_info_query.js'
import GetPendingRequestsQuery from './get_pending_requests_query.js'

export interface PendingRequestsPageResult {
  organization: Awaited<ReturnType<typeof GetOrganizationBasicInfoQuery.execute>>
  pendingRequests: Awaited<ReturnType<GetPendingRequestsQuery['execute']>>
}

export default class GetPendingRequestsPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: string): Promise<PendingRequestsPageResult> {
    const [pendingRequests, organization] = await Promise.all([
      new GetPendingRequestsQuery(this.execCtx).execute(organizationId),
      GetOrganizationBasicInfoQuery.execute(organizationId),
    ])

    return {
      organization,
      pendingRequests,
    }
  }
}
