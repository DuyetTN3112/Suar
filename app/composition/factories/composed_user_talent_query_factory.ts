import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import type { TalentDirectoryPageReader } from '#modules/users/actions/ports/outbound/talent_directory_page_reader'
import type { TalentSearchCandidateReader } from '#modules/users/actions/ports/outbound/talent_search_candidate_reader'
import type { TalentSkillCategoryReader } from '#modules/users/actions/ports/outbound/talent_skill_category_reader'
import type { TalentTaskMatchContextReader } from '#modules/users/actions/ports/outbound/talent_task_match_context_reader'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
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
    private readonly talents: UserTalentRepository
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

  makeDirectoryPage(context: UserActionContext): GetTalentDirectoryPageQuery {
    return new GetTalentDirectoryPageQuery(context, {
      searchTalents: this.makeSearch(context),
      pageReader: this.directoryPages,
      skillCategoryReader: this.skillCategories,
      buildExplainabilitySummary: (userIds) => this.talents.getExplainabilitySummaries(userIds),
    })
  }
}
