import { BaseQuery } from '#modules/users/actions/base_query'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { TalentDirectoryOptionsResult } from '#modules/users/actions/queries/talent/get_talent_directory_options_query'
import type { TalentDirectoryPageResult } from '#modules/users/actions/queries/talent/get_talent_directory_page_query'
import type { SearchTalentsDTO } from '#modules/users/actions/queries/search/search_talents_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export type RecruitingTalentDirectoryWorkspaceResult = TalentDirectoryPageResult &
  TalentDirectoryOptionsResult

export default class GetRecruitingTalentDirectoryWorkspaceQuery extends BaseQuery<
  SearchTalentsDTO,
  RecruitingTalentDirectoryWorkspaceResult
> {
  constructor(
    context: UserActionContext,
    private readonly access: UserRecruitingAccessReader,
    private readonly directory: {
      handle(input: SearchTalentsDTO): Promise<TalentDirectoryPageResult>
    },
    private readonly options: {
      execute(organizationId: string): Promise<TalentDirectoryOptionsResult>
    }
  ) {
    super(context)
  }

  async handle(input: SearchTalentsDTO): Promise<RecruitingTalentDirectoryWorkspaceResult> {
    const actor = await assertRecruitingDirectoryAccess(this.execCtx, this.access)
    const [directory, options] = await Promise.all([
      this.directory.handle(input),
      this.options.execute(actor.organizationId),
    ])

    return { ...directory, ...options }
  }
}
