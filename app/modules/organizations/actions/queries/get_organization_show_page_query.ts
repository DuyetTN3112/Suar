import db from '@adonisjs/lucid/services/db'

import { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'

import GetOrganizationDetailQuery from './get_organization_detail_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import type { CanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'

interface OrganizationReverseReviewItem {
  id: string
  reviewerId: string | null
  rating: number
  comment: string | null
  isAnonymous: boolean
  createdAt: string
}

interface OrganizationReviewSummary {
  total: number
  anonymous: number
  averageRating: number | null
  recent: OrganizationReverseReviewItem[]
}

interface OrganizationReverseReviewGovernanceSummary {
  total: number
  anonymous: number
  byTargetType: Record<string, number>
}

interface OrganizationReviewRow {
  id: string
  reviewer_id: string | null
  reviewer_username: string | null
  rating: number | string | null
  comment: string | null
  is_anonymous: boolean
  created_at: string | Date
}

interface ReverseReviewGovernanceRow {
  target_type: string | null
  is_anonymous: boolean
}

export interface OrganizationShowPageResult {
  organization: Awaited<ReturnType<GetOrganizationDetailQuery['execute']>>
  members: {
    id: string
    username: string
    email: string
    org_role: string
    role_name: string
  }[]
  membersPagination: CanonicalPagePagination
  userRole: string
  organizationReviews: OrganizationReviewSummary
  reverseReviewGovernance: OrganizationReverseReviewGovernanceSummary
}

/**
 * Composite Query: Get Organization Show Page Data
 *
 * Aggregates all data needed to render the organization show page
 * by running GetOrganizationDetailQuery and GetOrganizationShowDataQuery in parallel.
 */
export default class GetOrganizationShowPageQuery {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(
    organizationId: string,
    userId: string,
    input: { page?: unknown; perPage?: unknown } = {}
  ): Promise<OrganizationShowPageResult> {
    const dto = new GetOrganizationDetailDTO(organizationId, true, false, false)

    const [organization, showData] = await Promise.all([
      new GetOrganizationDetailQuery(this.execCtx).execute(dto),
      new GetOrganizationShowDataQuery().execute(organizationId, userId, input),
    ])

    const [organizationReviewStats, organizationReviewRows, reverseReviewStatsRows] =
      await Promise.all([
        reviewPublicApi.loadReverseReviewTargetStats('organization', organizationId),
        this.listOrganizationReviewRows(organizationId),
        this.listReverseReviewGovernanceRows(organizationId),
      ])
    const fallbackAverageRating =
      organizationReviewRows.length > 0
        ? Number(
            (
              organizationReviewRows.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) /
              organizationReviewRows.length
            ).toFixed(1)
          )
        : null
    const reverseReviewGovernance = reverseReviewStatsRows.reduce<OrganizationReverseReviewGovernanceSummary>(
      (summary, review) => {
        summary.total += 1

        if (review.is_anonymous === true) {
          summary.anonymous += 1
        }

        const targetType = review.target_type ?? 'unknown'
        summary.byTargetType[targetType] = (summary.byTargetType[targetType] ?? 0) + 1

        return summary
      },
      {
        total: 0,
        anonymous: 0,
        byTargetType: {},
      }
    )

    return {
      organization,
      members: showData.members,
      membersPagination: toCanonicalPagePagination(showData.membersMeta),
      userRole: showData.userRole,
      organizationReviews: {
        total: organizationReviewStats?.total_reviews ?? organizationReviewRows.length,
        anonymous:
          organizationReviewStats?.anonymous_reviews ??
          organizationReviewRows.filter((review) => review.is_anonymous === true).length,
        averageRating: organizationReviewStats?.average_rating ?? fallbackAverageRating,
        recent: organizationReviewRows.map((review) => ({
          id: review.id,
          reviewerId:
            review.is_anonymous === true
              ? null
              : (review.reviewer_username ?? review.reviewer_id),
          rating: Number(review.rating ?? 0),
          comment: review.comment,
          isAnonymous: review.is_anonymous,
          createdAt: String(review.created_at),
        })),
      },
      reverseReviewGovernance,
    }
  }
}
