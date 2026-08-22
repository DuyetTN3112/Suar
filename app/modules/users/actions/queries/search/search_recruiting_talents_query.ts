import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type {
  SearchTalentsDTO,
  TalentSearchResult,
} from '#modules/users/actions/queries/search/search_talents_query'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export default class SearchRecruitingTalentsQuery extends BaseQuery<
  SearchTalentsDTO,
  TalentSearchResult[]
> {
  constructor(
    private readonly context: UserActionContext,
    private readonly access: UserRecruitingAccessReader,
    private readonly search: {
      handle(input: SearchTalentsDTO): Promise<TalentSearchResult[]>
      executeAndWrap?: (input: SearchTalentsDTO) => Promise<Result<TalentSearchResult[], AppException>>
    }
  ) {
    super(context)
  }

  override async handle(input: SearchTalentsDTO): Promise<TalentSearchResult[]> {
    await assertRecruitingDirectoryAccess(this.context, this.access)
    return this.search.handle(input)
  }

  override async executeAndWrap(input: SearchTalentsDTO): Promise<Result<TalentSearchResult[], AppException>> {
    try {
      await assertRecruitingDirectoryAccess(this.context, this.access)
      return this.search.executeAndWrap
        ? await this.search.executeAndWrap(input)
        : Result.ok(await this.search.handle(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
