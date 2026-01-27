import { OrganizationMemberInsightsReader } from '#modules/organizations/dashboard/actions/ports/outbound/organization_member_insights_reader'

interface UserSkillSourceInsightsQuery {
  execute(input: { userIds: string[] }): Promise<{
    reviewedUserIds: string[]
    importedOnlyUserIds: string[]
  }>
}

interface ActiveReviewDisputeMemberIdsQuery {
  execute(memberUserIds: string[]): Promise<string[]>
}

export class OrganizationMemberInsightsReaderAdapter extends OrganizationMemberInsightsReader {
  constructor(
    private readonly userSkillSources: UserSkillSourceInsightsQuery,
    private readonly activeReviewDisputes: ActiveReviewDisputeMemberIdsQuery
  ) {
    super()
  }

  async loadForMemberUserIds(memberUserIds: string[]) {
    const uniqueMemberUserIds = [...new Set(memberUserIds)]
    if (uniqueMemberUserIds.length === 0) {
      return {
        reviewedMembers: 0,
        importedOnlyMembers: 0,
        underDisputeMembers: 0,
      }
    }

    const [skillSources, activeDisputeMemberIds] = await Promise.all([
      this.userSkillSources.execute({ userIds: uniqueMemberUserIds }),
      this.activeReviewDisputes.execute(uniqueMemberUserIds),
    ])

    return {
      reviewedMembers: new Set(skillSources.reviewedUserIds).size,
      importedOnlyMembers: new Set(skillSources.importedOnlyUserIds).size,
      underDisputeMembers: new Set(activeDisputeMemberIds).size,
    }
  }
}
