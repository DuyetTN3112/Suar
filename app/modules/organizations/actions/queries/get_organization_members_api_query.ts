import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'

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

/**
 * Query: Get Organization Members (API)
 *
 * Returns organization info + formatted member list for API consumption.
 */
export default class GetOrganizationMembersApiQuery {
  async execute(rawId: string): Promise<OrganizationMembersResult> {
    const organizationId = parseId(rawId)

    const organization = await OrganizationRepository.findById(organizationId)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', organizationId)
    }

    const members = await listingQueries.findMembersWithUser(organizationId)

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
      organization: organization.serialize(),
      members: formattedMembers,
    }
  }
}
