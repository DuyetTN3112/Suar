export interface OrganizationReviewOverview {
  organizationReviews: {
    total: number
    anonymous: number
    averageRating: number | null
    recent: {
      id: string
      reviewerId: string | null
      rating: number
      comment: string | null
      isAnonymous: boolean
      createdAt: string
    }[]
  }
  reverseReviewGovernance: {
    total: number
    anonymous: number
    byTargetType: Record<string, number>
  }
}

export abstract class OrganizationReverseReviewReader {
  abstract loadOrganizationReviewOverview(
    organizationId: string
  ): Promise<OrganizationReviewOverview>
}
