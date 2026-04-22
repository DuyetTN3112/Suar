import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import type { TalentDirectoryPageReader } from '#modules/users/actions/ports/outbound/talent_directory_page_reader'
import type { TalentDiscoveryReader } from '#modules/users/actions/ports/outbound/talent_discovery_reader'
import type { TalentPublicAccomplishmentReader } from '#modules/users/actions/ports/outbound/talent_public_accomplishment_reader'
import type { TalentSearchCandidateReader } from '#modules/users/actions/ports/outbound/talent_search_candidate_reader'
import type { TalentSkillCategoryReader } from '#modules/users/actions/ports/outbound/talent_skill_category_reader'
import type { TalentTaskMatchContextReader } from '#modules/users/actions/ports/outbound/talent_task_match_context_reader'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import GetRecruitingTalentDirectoryWorkspaceQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_directory_workspace_query'
import GetRecruitingTalentDiscoveryPageQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_discovery_page_query'
import GetRecruitingTalentProfileQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_profile_query'
import SearchRecruitingTalentsQuery from '#modules/users/actions/queries/search/search_recruiting_talents_query'
import SearchTalentsQuery from '#modules/users/actions/queries/search/search_talents_query'
import type GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/talent/get_talent_directory_options_query'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/talent/get_talent_directory_page_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates talent-search and directory-page queries from explicit outbound readers.
 */
export class ComposedUserTalentQueryFactory extends UserTalentQueryFactory {
  constructor(
    private readonly searchCandidates: TalentSearchCandidateReader,
    private readonly skillCategories: TalentSkillCategoryReader,
    private readonly taskMatchContexts: TalentTaskMatchContextReader,
    private readonly directoryPages: TalentDirectoryPageReader,
    private readonly talents: UserTalentRepository,
    private readonly recruitingAccess: UserRecruitingAccessReader,
    private readonly directoryOptions: GetTalentDirectoryOptionsQuery,
    private readonly profilePages: UserProfilePageQueryFactory,
    private readonly publicAccomplishments?: TalentPublicAccomplishmentReader,
    private talentDiscoveryReader?: TalentDiscoveryReader
  ) {
    super()
  }

  makeSearch(context: UserActionContext): SearchTalentsQuery {
    return new SearchTalentsQuery(context, {
      searchCandidateReader: this.searchCandidates,
      skillCategoryReader: this.skillCategories,
      taskMatchContextReader: this.taskMatchContexts,
      talents: this.talents,
    })
  }

  makeRecruitingSearch(context: UserActionContext): SearchRecruitingTalentsQuery {
    return new SearchRecruitingTalentsQuery(
      context,
      this.recruitingAccess,
      this.makeSearch(context)
    )
  }

  makeDirectoryPage(context: UserActionContext): GetTalentDirectoryPageQuery {
    return new GetTalentDirectoryPageQuery(context, {
      searchTalents: this.makeSearch(context),
      pageReader: this.directoryPages,
      skillCategoryReader: this.skillCategories,
      buildExplainabilitySummary: (userIds) => this.talents.getExplainabilitySummaries(userIds),
      ...(this.publicAccomplishments
        ? { publicAccomplishments: this.publicAccomplishments }
        : {}),
    })
  }

  makeRecruitingDirectoryWorkspace(
    context: UserActionContext
  ): GetRecruitingTalentDirectoryWorkspaceQuery {
    return new GetRecruitingTalentDirectoryWorkspaceQuery(
      context,
      this.recruitingAccess,
      this.makeDirectoryPage(context),
      this.directoryOptions
    )
  }

  makeRecruitingTalentProfile(context: UserActionContext): GetRecruitingTalentProfileQuery {
    return new GetRecruitingTalentProfileQuery(
      context,
      this.recruitingAccess,
      this.profilePages.makeView(context)
    )
  }

  configureTalentDiscoveryReader(reader: TalentDiscoveryReader): void {
    this.talentDiscoveryReader = reader
  }

  makeRecruitingTalentDiscoveryPage(
    context: HttpActionContext
  ): GetRecruitingTalentDiscoveryPageQuery {
    if (this.talentDiscoveryReader === undefined) {
      throw new Error('Talent Discovery reader has not been configured')
    }
    return new GetRecruitingTalentDiscoveryPageQuery(
      this.talentDiscoveryReader,
      context,
      this.publicAccomplishments,
      this.directoryOptions
    )
  }
}
