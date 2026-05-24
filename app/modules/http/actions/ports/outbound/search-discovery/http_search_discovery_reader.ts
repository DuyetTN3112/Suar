import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

export interface HttpSearchDiscoveryReader {
  discover<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options?: { readonly signal?: AbortSignal; readonly searchSessionId?: string }
  ): Promise<SearchDiscoveryResponse<TDocument>>
}
