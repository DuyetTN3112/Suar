import type { ReviewOrganizationInsightsReader } from '../../ports/outbound/review_organization_insights_reader.js'

import { BaseQuery } from '#modules/reviews/actions/base_query'

export interface GetActiveReviewDisputeMemberIdsInput {
  memberUserIds: string[]
}

export default class GetActiveReviewDisputeMemberIdsQuery extends BaseQuery<
  GetActiveReviewDisputeMemberIdsInput,
  string[]
> {
  constructor(private readonly insights: ReviewOrganizationInsightsReader) {
    super()
  }

  async handle(input: GetActiveReviewDisputeMemberIdsInput): Promise<string[]> {
    const uniqueMemberUserIds = [...new Set(input.memberUserIds.filter((userId) => userId.length > 0))]

    return uniqueMemberUserIds.length === 0 ? [] : this.insights.listActiveDisputeRevieweeIds(uniqueMemberUserIds)
  }

  execute(memberUserIds: string[]): Promise<string[]> {
    return this.handle({ memberUserIds })
  }
}
