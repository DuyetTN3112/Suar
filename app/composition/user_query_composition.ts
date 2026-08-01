import { PublicContractFeaturedReviewSkillReaderAdapter } from './adapters/public_contract_featured_review_skill_reader_adapter.js'
import { PublicContractTalentSkillCategoryReaderAdapter } from './adapters/public_contract_talent_skill_category_reader_adapter.js'
import { SearchTalentCandidateAdapter } from './adapters/search_talent_candidate_adapter.js'
import { TaskAssignmentDeliveryFactReaderAdapter } from './adapters/task_assignment_delivery_fact_reader_adapter.js'
import { TaskTalentMatchContextReaderAdapter } from './adapters/task_talent_match_context_reader_adapter.js'
import { UserReviewReaderAdapter } from './adapters/user_review_reader_adapter.js'
import { UserWorkHistoryReaderAdapter } from './adapters/user_work_history_reader_adapter.js'
import { searchEngineCapability } from './search_engine_composition.js'
import { userExternalDependencies } from './user_external_dependencies_composition.js'
import {
  userAccountRepository,
  userProfileRepository,
  userTalentRepository,
} from './user_persistence_composition.js'

import { ComposedUserProfilePageQueryFactory } from '#composition/factories/composed_user_profile_page_query_factory'
import { ComposedUserTalentQueryFactory } from '#composition/factories/composed_user_talent_query_factory'
import type { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'
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

export const userProfilePageQueryFactory = new ComposedUserProfilePageQueryFactory(
  featuredReviewSkills,
  assignmentDeliveryFacts,
  workHistory,
  userExternalDependencies.organizationMembership,
  userExternalDependencies.skill,
  userExternalDependencies.skillCatalog,
  userReviewReader,
  userAccountRepository,
  userProfileRepository
)

export const userTalentQueryFactory = new ComposedUserTalentQueryFactory(
  talentSearchCandidates,
  talentSkillCategories,
  talentTaskMatchContexts,
  talentDirectoryPages,
  userTalentRepository
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
