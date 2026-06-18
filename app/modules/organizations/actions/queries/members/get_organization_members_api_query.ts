import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  disabledOrganizationMemberSearchCandidateReader,
  type OrganizationMemberSearchCandidateReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_member_search_candidate_reader'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'

const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-[1-7][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

const parseId = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationException('ID is required')
  }

  const parsedValue = String(value)
  if (UUID_REGEX.test(parsedValue)) {
    return parsedValue
  }

  throw new ValidationException(`Invalid ID format: ${parsedValue}. Expected UUID.`)
}

interface FormattedMember {
  id: string
  org_role: string
  role_name: string
  joined_at: string
  user: {
    id: string
    username: string
    email: string | null
  }
}

interface OrganizationMembersResult {
  organization: Record<string, unknown>
  members: FormattedMember[]
}

export interface GetOrganizationMembersApiQueryDeps {
  searchCandidateReader: OrganizationMemberSearchCandidateReader
  findOrganizationById: OrganizationReader['findById']
  findMembersWithUserByIds: OrganizationMembershipRepository['findMembersWithUserByIds']
  findMembersWithUserBySearch: OrganizationMembershipRepository['findMembersWithUserBySearch']
  findMembersWithUser: OrganizationMembershipRepository['findMembersWithUser']
}

/**
 * Query: Get Organization Members (API)
 *
 * Returns organization info + formatted member list for API consumption.
 */
export default class GetOrganizationMembersApiQuery {
  private readonly deps: GetOrganizationMembersApiQueryDeps

  constructor(
    organizations: OrganizationReader,
    memberships: OrganizationMembershipRepository,
    deps: Partial<GetOrganizationMembersApiQueryDeps> = {}
  ) {
    this.deps = {
      searchCandidateReader: disabledOrganizationMemberSearchCandidateReader,
      findOrganizationById: organizations.findById.bind(organizations),
      findMembersWithUserByIds:
        memberships.findMembersWithUserByIds.bind(memberships),
      findMembersWithUserBySearch:
        memberships.findMembersWithUserBySearch.bind(memberships),
      findMembersWithUser: memberships.findMembersWithUser.bind(memberships),
      ...deps,
    }
  }

  async execute(rawId: string, rawQuery?: string): Promise<OrganizationMembersResult> {
    const organizationId = parseId(rawId)

    const organization = await this.deps.findOrganizationById(organizationId)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', organizationId)
    }

    const query = rawQuery?.trim()
    const userIds = await this.resolveEngineUserIds(query)
    const members = userIds
      ? await this.deps.findMembersWithUserByIds(organizationId, userIds)
      : query
        ? await this.deps.findMembersWithUserBySearch(organizationId, query)
        : await this.deps.findMembersWithUser(organizationId)

    const formattedMembers: FormattedMember[] = members.map((member) => ({
      id: `${member.organization_id}-${member.user_id}`,
      org_role: member.org_role,
      role_name: member.org_role,
      joined_at: member.created_at.toISOString(),
      user: {
        id: member.user.id,
        username: member.user.username,
        email: member.user.email,
      },
    }))

    return {
      organization,
      members: formattedMembers,
    }
  }

  private async resolveEngineUserIds(query?: string): Promise<string[] | null> {
    if (!query || !this.deps.searchCandidateReader.isEnabled()) {
      return null
    }

    try {
      const hits = await this.deps.searchCandidateReader.searchUserCandidates({
        q: query,
        limit: 100,
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.userId)
    } catch (error) {
      searchFallbackObserver.record({ surface: 'organizations.members.api', error })
      return null
    }
  }
}
