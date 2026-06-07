import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type {
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type { HttpGlobalSearchReader } from '#modules/http/actions/ports/outbound/http_global_search_reader'

export default class GetGlobalSearchQuery {
  constructor(private readonly search: HttpGlobalSearchReader) {}

  execute(
    rawQuery: string,
    execCtx: HttpActionContext,
    options?: HttpGlobalSearchOptions
  ): Promise<HttpGlobalSearchResult> {
    return this.search.search(rawQuery, execCtx, options)
  }

  async executeAndWrap(
    rawQuery: string,
    execCtx: HttpActionContext,
    options?: HttpGlobalSearchOptions
  ): Promise<Result<HttpGlobalSearchResult, AppException>> {
    try {
      return Result.ok(await this.execute(rawQuery, execCtx, options))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
