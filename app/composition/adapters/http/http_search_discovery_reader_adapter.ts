import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type { HttpSearchDiscoveryReader } from '#modules/http/actions/ports/outbound/search-discovery/http_search_discovery_reader'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'
import type { SearchPublicApiV2 } from '#modules/search/public_contracts/search_public_api'

export class HttpSearchDiscoveryReaderAdapter implements HttpSearchDiscoveryReader {
  constructor(private readonly searchCapability: SearchPublicApiV2) {}

  discover<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options?: { readonly signal?: AbortSignal; readonly searchSessionId?: string }
  ): Promise<SearchDiscoveryResponse<TDocument>> {
    return this.searchCapability.discover<TDocument>(request, execCtx, options)
  }
}
