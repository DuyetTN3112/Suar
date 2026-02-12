import { checkJoinEligibility } from '#modules/organizations/access/domain/org_permission_policy'
import { type OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'

interface JoinEligibilityResult {
  eligible: boolean
  organization: { id: string; name: string } | null
  message?: string
  existingMembership?: { status: OrganizationUserStatus } | null
}

/**
 * Query: Check Join Eligibility
 *
 * Checks if a user is eligible to join an organization.
 * Returns the organization info and membership status.
 */
export default class CheckJoinEligibilityQuery {
  constructor(
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async execute(
    organizationId: string,
    userId: string
  ): Promise<JoinEligibilityResult> {
    const organization = await this.organizations.findById(organizationId)
    if (!organization) {
      return { eligible: false, organization: null, message: 'Tổ chức không tồn tại' }
    }

    const orgJson = { id: organization.id, name: organization.name }

    const existingMembership = (await this.memberships.find(
      organizationId,
      userId
    )) as {
      status: OrganizationUserStatus
    } | null

    const membershipStatus = existingMembership?.status ?? null
    const eligibility = checkJoinEligibility(membershipStatus)

    if (!eligibility.eligible) {
      return {
        eligible: false,
        organization: orgJson,
        message: eligibility.message,
        existingMembership,
      }
    }

    return { eligible: true, organization: orgJson }
  }
}
