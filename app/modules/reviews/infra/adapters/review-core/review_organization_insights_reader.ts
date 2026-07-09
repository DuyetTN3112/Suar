import db from '@adonisjs/lucid/services/db'

import type { ReviewOrganizationInsightsReader as ReviewOrganizationInsightsReaderPort } from '#modules/reviews/actions/ports/outbound/review_organization_insights_reader'
import type { OrganizationReviewOverview } from '#modules/reviews/public_contracts/organization_review_insights'
import { ACTIVE_REVIEW_DISPUTE_STATUSES } from '#modules/reviews/public_contracts/review_constants'

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

interface ReviewTargetStatsRow {
  total_reviews: number | string | null
  anonymous_reviews: number | string | null
  average_rating: number | string | null
}

export default class ReviewOrganizationInsightsReader implements ReviewOrganizationInsightsReaderPort {
  async loadOrganizationReviewOverview(
    organizationId: string
  ): Promise<OrganizationReviewOverview> {
    const [targetStatsResult, reviewRowsResult, governanceRowsResult] = await Promise.all([
      db.rawQuery(
        `
          select
            count(*) as total_reviews,
            count(*) filter (where organization_reviews.is_anonymous = true) as anonymous_reviews,
            round(avg(organization_reviews.rating)::numeric, 1) as average_rating
          from (
            select reverse_reviews.rating, reverse_reviews.is_anonymous
            from reverse_reviews
            where reverse_reviews.target_type = 'organization'
              and reverse_reviews.target_id = ?
            union all
            select ser.rating, ser.is_anonymous_publicly as is_anonymous
            from sprint_environment_reviews ser
            where ser.target_type = 'organization'
              and ser.target_id = ?::text
          ) organization_reviews
        `,
        [organizationId, organizationId]
      ) as Promise<{ rows?: ReviewTargetStatsRow[] }>,
      db.rawQuery(
        `
          select *
          from (
            select
              reverse_reviews.id::text as id,
              reverse_reviews.reviewer_id::text as reviewer_id,
              reviewer.username as reviewer_username,
              reverse_reviews.rating,
              reverse_reviews.comment,
              reverse_reviews.is_anonymous,
              reverse_reviews.created_at
            from reverse_reviews
            left join users as reviewer on reviewer.id = reverse_reviews.reviewer_id
            where reverse_reviews.target_type = 'organization'
              and reverse_reviews.target_id = ?
            union all
            select
              ser.id::text as id,
              srp.reviewer_id::text as reviewer_id,
              reviewer.username as reviewer_username,
              ser.rating,
              ser.comment,
              ser.is_anonymous_publicly as is_anonymous,
              ser.created_at
            from sprint_environment_reviews ser
            inner join sprint_review_packages srp on srp.id = ser.package_id
            left join users as reviewer on reviewer.id::text = srp.reviewer_id
            where ser.target_type = 'organization'
              and ser.target_id = ?::text
          ) organization_reviews
          order by created_at desc
          limit 5
        `,
        [organizationId, organizationId]
      ) as Promise<{ rows?: OrganizationReviewRow[] }>,
      db.rawQuery(
        `
          select reverse_reviews.target_type, reverse_reviews.is_anonymous
          from reverse_reviews
          join review_sessions on review_sessions.id = reverse_reviews.review_session_id
          join task_assignments on task_assignments.id = review_sessions.task_assignment_id
          join tasks on tasks.id = task_assignments.task_id
          where tasks.organization_id = ?
          union all
          select ser.target_type, ser.is_anonymous_publicly as is_anonymous
          from sprint_environment_reviews ser
          inner join sprint_review_packages srp on srp.id = ser.package_id
          inner join project_sprints ps on ps.id = srp.sprint_id
          where ps.organization_id = ?
        `,
        [organizationId, organizationId]
      ) as Promise<{ rows?: ReverseReviewGovernanceRow[] }>,
    ])

    const reviewRows = reviewRowsResult.rows ?? []
    const targetStats = targetStatsResult.rows?.[0] ?? null
    const governanceRows = governanceRowsResult.rows ?? []
    const fallbackAverageRating =
      reviewRows.length === 0
        ? null
        : Number(
            (
              reviewRows.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) /
              reviewRows.length
            ).toFixed(1)
          )
    const reverseReviewGovernance = governanceRows.reduce<
      OrganizationReviewOverview['reverseReviewGovernance']
    >(
      (summary, review) => {
        summary.total += 1
        if (review.is_anonymous) summary.anonymous += 1

        const targetType = review.target_type ?? 'unknown'
        summary.byTargetType[targetType] = (summary.byTargetType[targetType] ?? 0) + 1
        return summary
      },
      { total: 0, anonymous: 0, byTargetType: {} }
    )

    return {
      organizationReviews: {
        total: Number(targetStats?.total_reviews ?? reviewRows.length),
        anonymous: Number(
          targetStats?.anonymous_reviews ??
            reviewRows.filter((review) => review.is_anonymous).length
        ),
        averageRating:
          targetStats?.average_rating === null || targetStats?.average_rating === undefined
            ? fallbackAverageRating
            : Number(targetStats.average_rating),
        recent: reviewRows.map((review) => ({
          id: review.id,
          reviewerId: review.is_anonymous ? null : (review.reviewer_username ?? review.reviewer_id),
          rating: Number(review.rating ?? 0),
          comment: review.comment,
          isAnonymous: review.is_anonymous,
          createdAt: String(review.created_at),
        })),
      },
      reverseReviewGovernance,
    }
  }

  async listActiveDisputeRevieweeIds(memberUserIds: string[]): Promise<string[]> {
    const rows = (await db
      .from('review_disputes')
      .whereIn('reviewee_id', memberUserIds)
      .whereIn('status', [...ACTIVE_REVIEW_DISPUTE_STATUSES])
      .distinct('reviewee_id')) as { reviewee_id: string }[]

    return rows
      .map((row) => row.reviewee_id)
      .filter((revieweeId) => typeof revieweeId === 'string' && revieweeId.length > 0)
  }
}
