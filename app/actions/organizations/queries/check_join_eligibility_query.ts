import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'

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

    if (existingMembership) {
      const status = existingMembership.status
      let message = ''

      if (status === OrganizationUserStatus.APPROVED) {
        message = 'Bạn đã là thành viên của tổ chức này'
      } else if (status === OrganizationUserStatus.PENDING) {
        message = 'Yêu cầu tham gia tổ chức của bạn đang chờ được duyệt'
      } else {
        message =
          'Yêu cầu tham gia của bạn đã bị từ chối. Bạn có thể liên hệ với quản trị viên tổ chức'
      }

      return {
        eligible: false,
        organization: orgJson,
        message,
        existingMembership,
      }
    }

    return { eligible: true, organization: orgJson }
  }
}
