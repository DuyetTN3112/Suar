import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from './get_current_profile_snapshot_query.js'
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from './get_user_skills_query.js'
import GetUserWorkHistoryQuery, { GetUserWorkHistoryDTO } from './get_user_work_history_query.js'

import type { UserReviewHistoryResult } from '#modules/reviews/public_contracts/user_review_history'
import type { FeaturedReviewSkillReader } from '#modules/users/actions/ports/outbound/featured_review_skill_reader'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserAssignmentDeliveryFactReader } from '#modules/users/actions/ports/outbound/user_assignment_delivery_fact_reader'
import type {
  UserOrganizationMembershipReaderWriter,
  UserSkillReader,
} from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserReviewReader } from '#modules/users/actions/ports/outbound/user_review_reader'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/user_skill_catalog'
import type { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface GetProfileShowPageInput {
  userId: string
}

export interface GetProfileShowPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  userSkills: Awaited<ReturnType<GetUserSkillsQuery['handle']>>
  completeness: number
  spiderChartData: Awaited<ReturnType<GetSpiderChartDataQuery['handle']>>
  deliveryMetrics: Awaited<ReturnType<GetUserDeliveryMetricsQuery['handle']>>
  featuredReviews: Awaited<ReturnType<GetFeaturedReviewsQuery['handle']>>
  reviewHistory: UserReviewHistoryResult
  workHistory: Awaited<ReturnType<GetUserWorkHistoryQuery['handle']>>
  currentSnapshot: Awaited<ReturnType<GetCurrentProfileSnapshotQuery['handle']>>['snapshot']
}

export default class GetProfileShowPageQuery {
  constructor(
    protected execCtx: UserActionContext,
    private readonly featuredReviewSkillReader: FeaturedReviewSkillReader,
    private readonly assignmentDeliveryFactReader: UserAssignmentDeliveryFactReader,
    private readonly workHistoryReader: UserWorkHistoryReader,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly skillReader: UserSkillReader,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly reviews: UserReviewReader,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository
  ) {}

  async execute(input: GetProfileShowPageInput): Promise<GetProfileShowPageResult> {
    const [
      profile,
      userSkills,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      reviewHistory,
      workHistory,
      currentSnapshot,
      reverseReviewSummary,
    ] = await Promise.all([
      new GetUserProfileQuery(
        this.execCtx,
        this.organizationMembership,
        this.skillCatalog,
        this.users,
        this.profiles
      ).handle(
        new GetUserProfileDTO(input.userId)
      ),
      new GetUserSkillsQuery(this.execCtx, this.skillReader, this.profiles).handle(
        new GetUserSkillsDTO(input.userId)
      ),
      new GetSpiderChartDataQuery(this.execCtx, this.skillReader).handle(
        new GetSpiderChartDataDTO(input.userId)
      ),
      new GetUserDeliveryMetricsQuery(
        this.execCtx,
        this.assignmentDeliveryFactReader,
        this.profiles
      ).handle(
        new GetUserDeliveryMetricsDTO(input.userId)
      ),
      new GetFeaturedReviewsQuery(
        this.execCtx,
        this.featuredReviewSkillReader,
        this.profiles
      ).handle(
        new GetFeaturedReviewsDTO(input.userId, 8)
      ),
      this.reviews.listHistory(this.execCtx),
      new GetUserWorkHistoryQuery(this.execCtx, this.workHistoryReader).handle(
        new GetUserWorkHistoryDTO(input.userId)
      ),
      new GetCurrentProfileSnapshotQuery(this.execCtx, this.profiles).handle(
        new GetCurrentProfileSnapshotDTO(input.userId)
      ),
      this.reviews.loadReverseSummary(input.userId),
    ])

    return {
      user: {
        ...profile.user,
        reverse_review_summary: reverseReviewSummary,
      },
      userSkills,
      completeness: profile.completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      reviewHistory,
      workHistory,
      currentSnapshot: currentSnapshot.snapshot,
    }
  }
}
