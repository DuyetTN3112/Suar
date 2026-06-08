import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AppException from '#modules/errors/public_contracts/application_exception'
import { toFilterHttpException } from '#modules/http/boundary/filter_http_problem'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildSearchDiscoveryRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_discovery_request_mapper'
import {
  SearchDiscoveryError,
  type SearchDiscoveryDiagnosticCode,
} from '#modules/search/public_contracts/search_discovery_contract'

@inject()
export default class SearchDiscoveryApiController {
  constructor(private readonly getSearchDiscovery: GetSearchDiscoveryQuery) {}

  async handle(ctx: HttpContext) {
    const request = buildSearchDiscoveryRequest(ctx.request.body())
    try {
      return await this.getSearchDiscovery
        .executeAndWrap(request, optionalActionContextFromHttp(ctx), {})
        .then((outcome) => outcome.getValue())
    } catch (error) {
      if (error instanceof SearchDiscoveryError) {
        throw toHttpException(error.code)
      }
      const filterHttpError = toFilterHttpException(error)
      if (filterHttpError !== undefined) throw filterHttpError
      throw error
    }
  }
}

function toHttpException(code: SearchDiscoveryDiagnosticCode): AppException {
  const status = statusFor(code)
  return new AppException(messageFor(code), {
    status,
    code,
    safeMessage: messageFor(code),
    retryable: isRetryable(code),
    details: { diagnosticCode: code },
  })
}

function statusFor(code: SearchDiscoveryDiagnosticCode): number {
  if (code === 'SEARCH_REQUEST_ABORTED') return 408
  if (code === 'SEARCH_SOURCE_TIMED_OUT') return 504
  if (
    code === 'SEARCH_SOURCE_UNAVAILABLE' ||
    code === 'SEARCH_INDEX_DISABLED' ||
    code === 'SEARCH_INDEX_STALE'
  ) {
    return 503
  }
  return 400
}

function isRetryable(code: SearchDiscoveryDiagnosticCode): boolean {
  return (
    code === 'SEARCH_REQUEST_ABORTED' ||
    code === 'SEARCH_SOURCE_TIMED_OUT' ||
    code === 'SEARCH_SOURCE_UNAVAILABLE' ||
    code === 'SEARCH_INDEX_DISABLED' ||
    code === 'SEARCH_INDEX_STALE'
  )
}

function messageFor(code: SearchDiscoveryDiagnosticCode): string {
  switch (code) {
    case 'SEARCH_SOURCE_TIMED_OUT':
      return 'Search provider timed out. Please retry.'
    case 'SEARCH_SOURCE_UNAVAILABLE':
      return 'Search is temporarily unavailable. Please retry.'
    case 'SEARCH_INDEX_DISABLED':
      return 'Search is temporarily unavailable.'
    case 'SEARCH_INDEX_STALE':
      return 'Search is refreshing. Please retry shortly.'
    case 'SEARCH_REQUEST_ABORTED':
      return 'Search request was cancelled.'
    case 'SEARCH_CURSOR_EXPIRED':
      return 'This result page expired. Start the search again.'
    case 'SEARCH_CURSOR_STALE':
      return 'Search results changed. Start the search again.'
    case 'SEARCH_CURSOR_INVALID':
      return 'This result page is invalid. Start the search again.'
    case 'SEARCH_SCOPE_CONTEXT_MISMATCH':
      return 'This search context is not available for the selected scope.'
    case 'SEARCH_SCOPE_UNSUPPORTED':
      return 'This search scope is not supported.'
    case 'SEARCH_RETRIEVAL_UNSUPPORTED':
      return 'This search mode is not supported for the selected scope.'
    case 'SEARCH_BLENDED_CAPABILITY_UNSUPPORTED':
      return 'Structured search is not available across all sources yet.'
    case 'SEARCH_FALLBACK_UNSAFE':
      return 'Search could not safely fall back to a compatible provider.'
    case 'SEARCH_PARTIAL_RESULTS':
      return 'Search returned partial results.'
  }
}
