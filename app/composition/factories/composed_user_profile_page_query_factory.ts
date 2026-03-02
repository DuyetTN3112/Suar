import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
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
import GetFeaturedReviewsQuery from '#modules/users/actions/queries/get_featured_reviews_query'
import GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates profile read use cases from explicit outbound capabilities.
 */
export class ComposedUserProfilePageQueryFactory extends UserProfilePageQueryFactory {
  constructor(
    private readonly featuredReviewSkills: FeaturedReviewSkillReader,
    private readonly assignmentDeliveryFacts: UserAssignmentDeliveryFactReader,
    private readonly workHistory: UserWorkHistoryReader,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly skills: UserSkillReader,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly reviews: UserReviewReader,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository
  ) {
    super()
  }

  makeFeaturedReviews(context: UserActionContext): GetFeaturedReviewsQuery {
    return new GetFeaturedReviewsQuery(context, this.featuredReviewSkills, this.profiles)
  }

  makeView(
    context: UserActionContext,
    workHistory: UserWorkHistoryReader = this.workHistory
  ): GetProfileViewPageQuery {
    return new GetProfileViewPageQuery(
      context,
      this.featuredReviewSkills,
      this.assignmentDeliveryFacts,
      workHistory,
      this.organizationMembership,
      this.skills,
      this.skillCatalog,
      this.reviews,
      this.users,
      this.profiles
    )
  }

  makeShow(
    context: UserActionContext,
    workHistory: UserWorkHistoryReader = this.workHistory
  ): GetProfileShowPageQuery {
    return new GetProfileShowPageQuery(
      context,
      this.featuredReviewSkills,
      this.assignmentDeliveryFacts,
      workHistory,
      this.organizationMembership,
      this.skills,
      this.skillCatalog,
      this.reviews,
      this.users,
      this.profiles
    )
  }

  makeDetail(context: UserActionContext): GetUserDetailQuery {
    return new GetUserDetailQuery(context, this.reviews, this.users)
  }
}
