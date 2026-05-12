import NotFoundException from '#exceptions/not_found_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/read/organization_repository'
import { parseId } from '#libs/id_utils'
import type { DatabaseId } from '#types/database'

interface FormattedMember {
  id: string
  org_role: string
  role_name: string
  joined_at: string
  user: {
    id: DatabaseId
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

    const members = await OrganizationUserRepository.findMembersWithUser(organizationId)

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
