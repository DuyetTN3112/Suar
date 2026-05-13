import LegacyAccomplishmentReadComparisonObserverAdapter from '#composition/adapters/accomplishments/publication/legacy_accomplishment_read_comparison_observer'
import { PublicContractFeaturedReviewSkillReaderAdapter } from '#composition/adapters/public-contracts/public_contract_featured_review_skill_reader_adapter'
import { PublicContractTalentSkillCategoryReaderAdapter } from '#composition/adapters/public-contracts/public_contract_talent_skill_category_reader_adapter'
import { SearchTalentCandidateAdapter } from '#composition/adapters/search/search_talent_candidate_adapter'
import { TalentPublicAccomplishmentReaderAdapter } from '#composition/adapters/accomplishments/publication/talent_public_accomplishment_reader_adapter'
import { TaskAssignmentDeliveryFactReaderAdapter } from '#composition/adapters/tasks/task_assignment_delivery_fact_reader_adapter'
import { TaskTalentMatchContextReaderAdapter } from '#composition/adapters/tasks/task_talent_match_context_reader_adapter'
import { UserRecruitingAccessReaderAdapter } from '#composition/adapters/users/user_recruiting_access_reader_adapter'
import { UserReviewReaderAdapter } from '#composition/adapters/users/user_review_reader_adapter'
import { UserTalentDirectoryOptionsReaderAdapter } from '#composition/adapters/users/user_talent_directory_options_reader_adapter'
import { UserWorkHistoryReaderAdapter } from '#composition/adapters/users/user_work_history_reader_adapter'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import { userExternalDependencies } from '#composition/users/user-external-dependencies/user_external_dependencies_composition'
import {
  userAccountRepository,
  userProfileRepository,
  userTalentRepository,
} from '#composition/users/user-persistence/user_persistence_composition'

import { readLegacyAccomplishmentCutoverDecision } from '#composition/accomplishments/backfill/legacy_accomplishment_backfill_composition'
import { ComposedUserProfilePageQueryFactory } from '#composition/factories/composed_user_profile_page_query_factory'
import { ComposedUserTalentQueryFactory } from '#composition/factories/composed_user_talent_query_factory'
import { accomplishmentPublicProjectionReader } from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_reader'
import type { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/talent/get_talent_directory_options_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { PostgresTalentDirectoryPageReader } from '#modules/users/infra/repositories/read/postgres_talent_directory_page_reader'

const featuredReviewSkills = new PublicContractFeaturedReviewSkillReaderAdapter()
const assignmentDeliveryFacts = new TaskAssignmentDeliveryFactReaderAdapter()
const workHistory = new UserWorkHistoryReaderAdapter()
export const userReviewReader = new UserReviewReaderAdapter()
const talentSearchCandidates = new SearchTalentCandidateAdapter(searchEngineCapability)
const talentSkillCategories = new PublicContractTalentSkillCategoryReaderAdapter()
const talentTaskMatchContexts = new TaskTalentMatchContextReaderAdapter()
const talentDirectoryPages = new PostgresTalentDirectoryPageReader()
const recruitingAccess = new UserRecruitingAccessReaderAdapter()
const talentDirectoryOptions = new GetTalentDirectoryOptionsQuery(
  new UserTalentDirectoryOptionsReaderAdapter()
)
const publicTalentAccomplishments = new TalentPublicAccomplishmentReaderAdapter(
  accomplishmentPublicProjectionReader
)
const legacyReadComparisonObserver = new LegacyAccomplishmentReadComparisonObserverAdapter()
const legacyAccomplishmentCutoverDecision = readLegacyAccomplishmentCutoverDecision()

export const userProfilePageQueryFactory = new ComposedUserProfilePageQueryFactory(
  featuredReviewSkills,
  assignmentDeliveryFacts,
  workHistory,
  userExternalDependencies.organizationMembership,
  userExternalDependencies.skill,
  userExternalDependencies.skillCatalog,
  userReviewReader,
  userAccountRepository,
  userProfileRepository,
  legacyReadComparisonObserver,
  legacyAccomplishmentCutoverDecision
)

export const userTalentQueryFactory = new ComposedUserTalentQueryFactory(
  talentSearchCandidates,
  talentSkillCategories,
  talentTaskMatchContexts,
  talentDirectoryPages,
  userTalentRepository,
  recruitingAccess,
  talentDirectoryOptions,
  userProfilePageQueryFactory,
  publicTalentAccomplishments
)

export const makeGetFeaturedReviewsQuery = (context: UserActionContext) =>
  userProfilePageQueryFactory.makeFeaturedReviews(context)

export const makeGetProfileViewPageQuery = (
  context: UserActionContext,
  workHistoryReader?: UserWorkHistoryReader
) => userProfilePageQueryFactory.makeView(context, workHistoryReader)

export const makeGetProfileShowPageQuery = (
  context: UserActionContext,
  workHistoryReader?: UserWorkHistoryReader
) => userProfilePageQueryFactory.makeShow(context, workHistoryReader)

export const makeSearchTalentsQuery = (context: UserActionContext) =>
  userTalentQueryFactory.makeSearch(context)

export const makeGetTalentDirectoryPageQuery = (context: UserActionContext) =>
  userTalentQueryFactory.makeDirectoryPage(context)
