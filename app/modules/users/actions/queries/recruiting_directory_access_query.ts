import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'

export default class RecruitingDirectoryAccessQuery {
  constructor(private readonly access: UserRecruitingAccessReader) {}

  canAccess(organizationId: string, userId: string): Promise<boolean> {
    return this.access.canAccessDirectory(organizationId, userId)
  }

  async canViewTalent(
    organizationId: string,
    userId: string,
    talentUserId: string
  ): Promise<boolean> {
    const canAccess = await this.access.canAccessDirectory(organizationId, userId)
    if (!canAccess) {
      return false
    }

    return this.access.talentBelongsToOrganization(talentUserId, organizationId)
  }
}
