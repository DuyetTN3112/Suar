import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { GlobalSearchTaskResult } from '#modules/search/public_contracts/global_search_contract'

export interface SearchPublicTaskListingInput {
  keyword?: string | null
  per_page?: number
}

export interface SearchPublicTaskListingResult {
  data: GlobalSearchTaskResult[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export type SearchPublicTaskListing = (
  input: SearchPublicTaskListingInput,
  context: HttpActionContext
) => Promise<SearchPublicTaskListingResult>
