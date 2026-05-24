import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/http/actions/base_query'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'
import type { SearchDiscoveryPublicApi } from '#modules/search/public_contracts/search_public_api'

type SearchDiscoveryCapability = SearchDiscoveryPublicApi & {
  isEnabled?: () => boolean
}

type SearchDiscoveryOptions = {
  readonly signal?: AbortSignal
  readonly searchSessionId?: string
}

export default class GetSearchDiscoveryQuery extends BaseQuery {
  constructor(private readonly search: SearchDiscoveryCapability) {
    super()
  }

  isEnabled(): boolean {
    return this.search.isEnabled?.() ?? true
  }

  async executeAndWrap<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options?: SearchDiscoveryOptions
  ): Promise<Result<SearchDiscoveryResponse<TDocument>, AppException>> {
    try {
      return Result.ok(await this.execute<TDocument>(request, execCtx, options))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  execute<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options?: SearchDiscoveryOptions
  ): Promise<SearchDiscoveryResponse<TDocument>> {
    return this.search.discover(request, execCtx, options)
  }
}
