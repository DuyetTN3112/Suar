import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import SearchDiscoveryApiController from '#modules/http/controllers/search-discovery/search_discovery_api_controller'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { SearchDiscoveryRequest } from '#modules/search/public_contracts/search_discovery_contract'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'

const request: SearchDiscoveryRequest = {
  criteria: {
    context: 'tasks.discovery.public',
    schemaVersion: 1,
    text: { value: '  rollout  ' },
    sort: [],
    page: { size: 20 },
  },
  search: { scope: 'task', retrievalMode: 'lexical' },
}

function response() {
  return {
    context: request.criteria.context,
    schemaVersion: request.criteria.schemaVersion,
    canonicalCriteria: request.criteria,
    hits: [],
    total: { value: 0, relation: 'eq' as const },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'search.tasks.discovery.v1',
      degraded: false,
      partial: false,
      requestId: 'request-1234567890123456',
    },
    search: {
      scope: 'task' as const,
      inputMode: 'query' as const,
      submittedQuery: '  rollout  ',
      normalizedQuery: 'rollout',
      retrievalMode: 'lexical' as const,
      rankingVersion: 'tasks.lexical.v1',
      searchSessionId: 'session-1234567890123456',
      requestId: 'request-1234567890123456',
      diagnostics: [],
      sources: [],
    },
    authority: {
      hits: { state: 'authoritative' as const, sources: ['tasks' as const] },
      total: { state: 'authoritative' as const, sources: ['tasks' as const] },
      facets: [],
    },
  }
}

function context(body: unknown) {
  return {
    auth: { user: null },
    session: { get: () => undefined },
    currentOrganizationId: null,
    currentOrganizationRole: null,
    requestContext: {
      requestId: 'http-request-1234567890123456',
      traceId: 'http-trace-1234567890123456',
      correlationId: 'http-correlation-1234567890123456',
    },
    request: {
      body: () => body,
      ip: () => '127.0.0.1',
      header: (name: string) => (name === 'user-agent' ? 'test-agent' : undefined),
    },
  }
}

test.group('Unit | HTTP Search Discovery API Controller', () => {
  test('maps a canonical request, preserves anonymous context, and returns the discovery payload', async ({
    assert,
  }) => {
    const calls: Array<{ request: SearchDiscoveryRequest; userId: string | null }> = []
    const query = new GetSearchDiscoveryQuery({
      discover: (input: SearchDiscoveryRequest, execCtx: HttpActionContext) => {
        calls.push({ request: input, userId: execCtx.userId })
        return Promise.resolve(response())
      },
    })
    const controller = new SearchDiscoveryApiController(query)

    const result = await controller.handle(context(request) as never)

    assert.deepEqual(result, response())
    assert.deepEqual(calls, [{ request, userId: null }])
  })

  test('rejects malformed transport envelopes before invoking the query', async ({ assert }) => {
    let invoked = false
    const controller = new SearchDiscoveryApiController(
      new GetSearchDiscoveryQuery({
        discover: () => {
          invoked = true
          return Promise.resolve(response())
        },
      })
    )

    const error = await controller
      .handle(context({ criteria: {}, search: { scope: 'task' } }) as never)
      .catch((caught: unknown) => caught)

    assert.instanceOf(error, ValidationException)
    assert.isFalse(invoked)
  })

  test('maps stable Search diagnostics to safe canonical HTTP errors', async ({ assert }) => {
    const controller = new SearchDiscoveryApiController(
      new GetSearchDiscoveryQuery(
        new SearchDiscoveryApiQueryStub(new SearchDiscoveryError('SEARCH_CURSOR_EXPIRED'))
      )
    )

    const error = await controller
      .handle(context(request) as never)
      .catch((caught: unknown) => caught)

    assert.instanceOf(error, AppException)
    assert.equal((error as AppException).code, 'SEARCH_CURSOR_EXPIRED')
    assert.equal((error as AppException).status, 400)
    assert.isFalse((error as AppException).retryable)
    assert.notInclude((error as Error).message, 'search_context_missing_exception')
  })

  test('maps unavailable Filter contexts to an indistinguishable unauthorized response', async ({
    assert,
  }) => {
    const controller = new SearchDiscoveryApiController(
      new GetSearchDiscoveryQuery(
        new SearchDiscoveryApiQueryStub(new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE'))
      )
    )

    const error = await controller
      .handle(context(request) as never)
      .catch((caught: unknown) => caught)

    assert.instanceOf(error, AppException)
    assert.equal((error as AppException).code, 'FILTER_CONTEXT_UNAVAILABLE')
    assert.equal((error as AppException).status, 401)
    assert.isFalse((error as AppException).retryable)
  })
})

class SearchDiscoveryApiQueryStub {
  constructor(private readonly failure: Error) {}

  discover(): Promise<never> {
    return Promise.reject(this.failure)
  }
}
