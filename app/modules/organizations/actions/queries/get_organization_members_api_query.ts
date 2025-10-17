import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import type { OrganizationMemberSearchCandidateReader } from '#modules/organizations/actions/ports/organization_member_search_candidate_reader'
import { EngineOrganizationMemberSearchCandidateReader } from '#modules/organizations/infra/adapters/engine_organization_member_search_candidate_reader'
import { OrganizationInfraMapper } from '#modules/organizations/infra/mapper/organization_infra_mapper'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

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

interface GetOrganizationMembersApiQueryDeps {
  searchCandidateReader: OrganizationMemberSearchCandidateReader
  findOrganizationById: typeof OrganizationRepository.findById
  findMembersWithUserByIds: typeof listingQueries.findMembersWithUserByIds
  findMembersWithUserBySearch: typeof listingQueries.findMembersWithUserBySearch
  findMembersWithUser: typeof listingQueries.findMembersWithUser
}

/**
 * Query: Get Organization Members (API)
 *
 * Returns organization info + formatted member list for API consumption.
 */
export default class GetOrganizationMembersApiQuery {
  constructor(
    private readonly deps: GetOrganizationMembersApiQueryDeps = {
      searchCandidateReader: new EngineOrganizationMemberSearchCandidateReader(),
      findOrganizationById: (...args) => OrganizationRepository.findById(...args),
      findMembersWithUserByIds: listingQueries.findMembersWithUserByIds,
      findMembersWithUserBySearch: listingQueries.findMembersWithUserBySearch,
      findMembersWithUser: listingQueries.findMembersWithUser,
    }
  ) {}

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
      joined_at: member.created_at.toISO() ?? '',
      user: {
        id: member.user.id,
        username: member.user.username,
        email: member.user.email,
      },
    }))

    return {
      organization: OrganizationInfraMapper.toRecord(organization),
      members: formattedMembers,
    }
  }

  private async resolveEngineUserIds(query?: string): Promise<string[] | null> {
    if (!query || !isSearchRuntimeEnabled()) {
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
    } catch {
      return null
    }
  }
}
