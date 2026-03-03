export interface UserRecruitingAccessReader {
  canAccessDirectory(organizationId: string, userId: string): Promise<boolean>

  talentBelongsToOrganization(
    talentUserId: string,
    organizationId: string
  ): Promise<boolean>
}
