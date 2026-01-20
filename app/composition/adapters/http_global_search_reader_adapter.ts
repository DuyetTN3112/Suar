import type {
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type { HttpGlobalSearchReader } from '#modules/http/actions/ports/outbound/http_global_search_reader'
import type {
  SearchPublicApi,
} from '#modules/search/public_contracts/search_public_api'

export class HttpGlobalSearchReaderAdapter implements HttpGlobalSearchReader {
  constructor(private readonly searchCapability: SearchPublicApi) {}

  async search(
    rawQuery: string,
    execCtx: HttpActionContext,
    options?: HttpGlobalSearchOptions
  ): Promise<HttpGlobalSearchResult> {
    const result = await this.searchCapability.search(
      rawQuery,
      execCtx,
      options
    )

    return {
      query: result.query,
      talents: result.talents,
      tasks: result.tasks,
      projects: result.projects,
      skills: result.skills,
      organizations: result.organizations,
      comments: result.comments,
      results: result.results,
      candidateResultCount: result.candidateResultCount,
      candidateTotalByType: result.candidateTotalByType,
      candidateFieldFacets: result.candidateFieldFacets,
      resultLimit: result.resultLimit,
      resultsTruncated: result.resultsTruncated,
      sourceStatuses: result.sourceStatuses,
    }
  }
}
