import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewRecord,
  FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface ListSavedFilterViewsQueryInput {
  principal: FilterPrincipal
  context: string
}

export class ListSavedFilterViewsQuery {
  constructor(
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization
  ) {}

  async executeAndWrap(input: ListSavedFilterViewsQueryInput): Promise<Result<readonly FilterSavedViewRecord[], AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(input: ListSavedFilterViewsQueryInput): Promise<readonly FilterSavedViewRecord[]> {
    const viewIds = await this.authorization.listAuthorizedViewIds({
      principal: input.principal,
      context: input.context,
      action: 'read',
    })
    const candidates = await this.repository.listByIds({ viewIds, context: input.context })
    const decisions = await Promise.all(
      candidates.map((record) =>
        this.authorization.canPerform({ principal: input.principal, action: 'read', record })
      )
    )
    return candidates.filter((_record, index) => decisions[index] === true)
  }
}
