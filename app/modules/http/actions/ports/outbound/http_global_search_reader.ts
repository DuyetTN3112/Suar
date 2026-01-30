import type {
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export interface HttpGlobalSearchReader {
  search(
    rawQuery: string,
    execCtx: HttpActionContext,
    options?: HttpGlobalSearchOptions
  ): Promise<HttpGlobalSearchResult>
}
