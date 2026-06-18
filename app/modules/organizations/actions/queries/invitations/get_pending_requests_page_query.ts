import GetPendingRequestsQuery from './get_pending_requests_query.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import GetOrganizationBasicInfoQuery from '#modules/organizations/actions/queries/directory/get_organization_basic_info_query'

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
