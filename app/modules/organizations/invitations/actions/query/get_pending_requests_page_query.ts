import GetPendingRequestsQuery from './get_pending_requests_query.js'

import GetOrganizationBasicInfoQuery from '#modules/organizations/directory/actions/query/get_organization_basic_info_query'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'

export interface PendingRequestsPageResult {
  organization: Awaited<ReturnType<GetOrganizationBasicInfoQuery['execute']>>
  pendingRequests: Awaited<ReturnType<GetPendingRequestsQuery['execute']>>
}

export default class GetPendingRequestsPageQuery {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async execute(organizationId: string): Promise<PendingRequestsPageResult> {
    const [pendingRequests, organization] = await Promise.all([
      new GetPendingRequestsQuery(this.execCtx, this.memberships).execute(organizationId),
      new GetOrganizationBasicInfoQuery(this.organizations).execute(organizationId),
    ])

    return {
      organization,
      pendingRequests,
    }
  }
}
