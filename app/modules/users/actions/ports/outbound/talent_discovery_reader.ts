import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { SearchDiscoveryResponse } from '#modules/search/public_contracts/search_discovery_contract'
import type { TalentSearchDiscoveryDocument } from '#modules/search/public_contracts/talent_search_discovery_document'
import type { SearchTalentsDTO } from '#modules/users/public_contracts/talent_search'

export interface TalentDiscoveryReaderInput {
  readonly input: SearchTalentsDTO
  readonly execCtx: HttpActionContext
  readonly cursor?: string
  readonly searchSessionId?: string
  readonly signal?: AbortSignal
}

export interface TalentDiscoveryReader {
  read(input: TalentDiscoveryReaderInput): Promise<SearchDiscoveryResponse<TalentSearchDiscoveryDocument>>
}
