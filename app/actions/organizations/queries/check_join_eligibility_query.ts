import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import { type OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import { checkJoinEligibility } from '#actions/organizations/rules/org_permission_policy'

interface JoinEligibilityResult {
  eligible: boolean
  organization: { id: DatabaseId; name: string } | null
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
  static async execute(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<JoinEligibilityResult> {
    const organization = await Organization.find(organizationId)
    if (!organization) {
      return { eligible: false, organization: null, message: 'Tổ chức không tồn tại' }
    }

    const orgJson = { id: organization.id, name: organization.name }

    const existingMembership = (await OrganizationUser.findMembership(organizationId, userId)) as {
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
