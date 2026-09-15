import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewRecord,
  FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export interface GetSavedFilterViewQueryInput {
  viewId: string
  principal: FilterPrincipal
}

export class GetSavedFilterViewQuery {
  constructor(
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization
  ) {}

  async executeAndWrap(input: GetSavedFilterViewQueryInput): Promise<Result<FilterSavedViewRecord, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(input: GetSavedFilterViewQueryInput): Promise<FilterSavedViewRecord> {
    const record = await this.repository.findById(input.viewId)
    if (
      record === null ||
      !(await this.authorization.canPerform({ principal: input.principal, action: 'read', record }))
    ) {
      throw new FilterSavedViewAccessError()
    }
    return record
  }
}
