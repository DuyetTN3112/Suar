import { ORGANIZATION_PAGINATION } from '#modules/organizations/members/actions/dtos/common/organization_pagination'
import type { OrganizationMembershipRepository } from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

interface MemberData {
  id: string
  username: string
  email: string
  org_role: string
  role_name: string
}

interface ShowOrganizationResult {
  members: MemberData[]
  membersMeta: ReturnType<typeof buildPaginationMeta>
  userRole: string
}

/**
 * Query: Get Organization Show Data
 *
 * Returns members preview and user's role for the organization show page.
 * Works alongside GetOrganizationDetailQuery for the full show page data.
 */
export default class GetOrganizationShowDataQuery {
  constructor(private readonly memberships: OrganizationMembershipRepository) {}

  /**
   * Get members list and user's role for the show page.
   */
  async execute(
    organizationId: string,
    userId: string,
    input: { page?: unknown; perPage?: unknown } = {}
  ): Promise<ShowOrganizationResult> {
    const pagination = normalizePagination(input, ORGANIZATION_PAGINATION, { perPage: 10 })
    const membersPreview = await this.memberships.paginateMembers(organizationId, {
      page: pagination.page,
      limit: pagination.perPage,
      statusFilter: 'approved',
    })

    const members = membersPreview.data.map((m) => ({
      id: m.user_id,
      username: m.user.username,
      email: m.user.email ?? '',
      org_role: m.org_role,
      role_name: m.org_role,
    }))

    // User's role in this organization
    const userMembership = await this.memberships.getContext(
      organizationId,
      userId,
      undefined,
      false
    )
    const userOrgRole = userMembership?.role

    return {
      members,
      membersMeta: buildPaginationMeta(membersPreview.total, pagination),
      userRole: userOrgRole ?? '',
    }
  }
}
