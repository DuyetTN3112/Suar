import { GetOrganizationMembersDTO } from '../../dtos/request/members/get_organization_members_dto.js'

import GetOrganizationMembersQuery from './get_organization_members_query.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import GetOrganizationMetadataQuery from '#modules/organizations/actions/queries/access/get_organization_metadata_query'
import GetOrganizationBasicInfoQuery from '#modules/organizations/actions/queries/directory/get_organization_basic_info_query'
import GetPendingRequestsQuery from '#modules/organizations/actions/queries/invitations/get_pending_requests_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import {
  disabledOrganizationMemberSearchCandidateReader,
  type OrganizationMemberSearchCandidateReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_member_search_candidate_reader'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import GetOrganizationShowDataQuery from '#modules/organizations/actions/queries/members/get_organization_show_data_query'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export interface OrganizationMembersPageResult {
  organization: { id: string; name: string } | null
  members: unknown[]
  roles: unknown[]
  userRole: string
  pendingRequests: unknown[]
}

export interface OrganizationMembersPageFilters {
  page?: number
  limit?: number
  roleId?: string
  search?: string
  statusFilter?: 'active' | 'pending' | 'inactive'
  include?: ('activity' | 'audit')[]
  joinDateStart?: string
  joinDateEnd?: string
}

/**
 * Query: Get Organization Members Page Data
 *
 * Composite query that aggregates all data needed to render
 * the organization members management page.
 */
export default class GetOrganizationMembersPageQuery {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly searchCandidates: OrganizationMemberSearchCandidateReader =
      disabledOrganizationMemberSearchCandidateReader
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    filters?: OrganizationMembersPageFilters
  ): Promise<OrganizationMembersPageResult> {
    const currentUserId = userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    const membersDTO = GetOrganizationMembersDTO.fromFilters(organizationId, omitUndefined({
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 100,
      role_id: filters?.roleId,
      search: filters?.search,
      sort_by: 'joined_at',
      sort_order: 'desc' as const,
      status_filter: filters?.statusFilter,
      include: filters?.include,
      join_date_start: filters?.joinDateStart,
      join_date_end: filters?.joinDateEnd,
    }))

    const [membersResult, pendingRequests, metadata, organization, showData] = await Promise.all([
      new GetOrganizationMembersQuery(this.execCtx, this.memberships, {
        searchCandidateReader: this.searchCandidates,
      }).execute(membersDTO),
      new GetPendingRequestsQuery(this.execCtx, this.memberships).execute(organizationId),
      new GetOrganizationMetadataQuery().execute(),
      new GetOrganizationBasicInfoQuery(this.organizations).execute(organizationId),
      new GetOrganizationShowDataQuery(this.memberships).execute(organizationId, userId),
    ])

    return {
      organization,
      members: membersResult.data,
      roles: metadata.roles,
      userRole: showData.userRole,
      pendingRequests,
    }
  }
}
