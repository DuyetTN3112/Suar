import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { requireSavedViewContext } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import {
  FilterSavedViewAccessError,
  type FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { ExecuteFilterQueryInput } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query_types'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type {
  FilterPreference,
} from '#modules/filtering/public_contracts/filter_contracts'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'

export interface SavedFilterViewCriteriaExecutor {
  execute<T = unknown>(input: ExecuteFilterQueryInput): Promise<QueryCriteriaResponse<T>>
}

export interface ExecuteSavedFilterViewQueryInput {
  readonly viewId: string
  readonly principal: FilterPrincipal
  readonly page: {
    readonly size: number
    readonly cursor?: string
    readonly offset?: number
  }
  readonly preferences?: readonly FilterPreference[]
  readonly requestId: string
  readonly signal?: AbortSignal
}

export class ExecuteSavedFilterViewQuery {
  constructor(
    private readonly repository: FilterSavedViewRepository,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly contexts: FilterContextProvider,
    private readonly criteriaExecutor: SavedFilterViewCriteriaExecutor
  ) {}

  async executeAndWrap<T = unknown>(
    input: ExecuteSavedFilterViewQueryInput
  ): Promise<Result<QueryCriteriaResponse<T>, AppException>> {
    try {
      return Result.ok(await this.execute<T>(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute<T = unknown>(
    input: ExecuteSavedFilterViewQueryInput
  ): Promise<QueryCriteriaResponse<T>> {
    const record = await this.repository.findById(input.viewId)
    if (
      record === null ||
      record.migrationState !== 'current' ||
      !(await this.authorization.canPerform({ principal: input.principal, action: 'read', record }))
    ) {
      throw new FilterSavedViewAccessError()
    }
    await requireSavedViewContext(this.contexts, {
      context: record.view.context,
      principal: input.principal,
    })
    const semantic = record.view.semanticState
    const criteria: QueryCriteriaRequest = {
      context: record.view.context.key,
      schemaVersion: record.view.context.schemaVersion,
      ...(semantic.textQuery === null ? {} : { text: { value: semantic.textQuery } }),
      ...(semantic.filter === null ? {} : { filter: semantic.filter }),
      ...(input.preferences === undefined ? {} : { preferences: input.preferences }),
      sort: semantic.sort,
      projection: semantic.projection,
      page: input.page,
    }
    return this.criteriaExecutor.execute<T>({
      criteria,
      principal: input.principal,
      requestId: input.requestId,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    })
  }
}
