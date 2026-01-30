import type { ReviewOrganizationInsightsReader } from '../ports/outbound/review_organization_insights_reader.js'

export default class GetActiveReviewDisputeMemberIdsQuery {
  constructor(private readonly insights: ReviewOrganizationInsightsReader) {}

  execute(memberUserIds: string[]): Promise<string[]> {
    const uniqueMemberUserIds = [...new Set(memberUserIds.filter((userId) => userId.length > 0))]

    return uniqueMemberUserIds.length === 0
      ? Promise.resolve([])
      : this.insights.listActiveDisputeRevieweeIds(uniqueMemberUserIds)
  }
}
