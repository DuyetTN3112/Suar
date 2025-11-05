import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  SearchTalentsDTO,
  TalentSearchResult,
} from '#modules/users/actions/queries/search_talents_query'
import { makeSearchTalentsQuery } from '#modules/users/bootstrap/user_query_factory'

export type { SearchTalentsDTO, TalentSearchResult }

export async function searchTalents(
  input: SearchTalentsDTO,
  execCtx: HttpActionContext
): Promise<TalentSearchResult[]> {
  return makeSearchTalentsQuery(execCtx).handle(input)
}
