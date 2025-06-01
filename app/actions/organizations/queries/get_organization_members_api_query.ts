import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'
import { parseId } from '#libs/id_utils'

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
  constructor(protected ctx: HttpContext) {}

  async execute(rawId: string): Promise<OrganizationMembersResult> {
    const organizationId = parseId(rawId)

    const organization = await Organization.find(organizationId)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', organizationId)
    }

    const members = await OrganizationUser.query()
      .where('organization_id', organizationId)
      .preload('user')
      .orderBy('created_at', 'asc')

    const formattedMembers: FormattedMember[] = members.map((member) => ({
      id: `${member.organization_id}-${member.user_id}`,
      org_role: member.org_role,
      role_name: member.org_role,
      joined_at: member.created_at.toISO()!,
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
