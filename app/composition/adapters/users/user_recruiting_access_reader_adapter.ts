import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import { canAccessOrganizationAdminShell } from '#modules/organizations/public_contracts/access/organization_access'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'

export class UserRecruitingAccessReaderAdapter implements UserRecruitingAccessReader {
  async canAccessDirectory(organizationId: string, userId: string): Promise<boolean> {
    const membership = await organizationRouteAccessReader.findApprovedMembership(
      organizationId,
      userId
    )
    return canAccessOrganizationAdminShell(membership?.role ?? null).allowed
  }

  async talentBelongsToOrganization(
    talentUserId: string,
    organizationId: string
  ): Promise<boolean> {
    const talent = await userPublicApi.findById(talentUserId)
    return talent?.current_organization_id === organizationId
  }
}
