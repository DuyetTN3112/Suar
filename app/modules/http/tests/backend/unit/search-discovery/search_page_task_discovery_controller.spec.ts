import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import type { SearchPageDiscoveryModel } from '#modules/http/actions/dtos/search-discovery/search_page_discovery'
import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import SearchPageController from '#modules/http/controllers/search-discovery/search_page_controller'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { GlobalSearchResult } from '#modules/search/public_contracts/global_search_contract'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

interface RenderedProps {
  query?: string
  activeType?: string
  discovery?: SearchPageDiscoveryModel
}

interface DiscoveryOptions {
  readonly signal?: AbortSignal
  readonly searchSessionId?: string
}

function emptyLegacyResult(query: string): GlobalSearchResult {
  return {
    query,
    talents: [],
    tasks: [],
    projects: [],
    skills: [],
    organizations: [],
    comments: [],
    results: [],
    candidateResultCount: 0,
    candidateTotalByType: {
      all: 0,
      talent: 0,
      task: 0,
      project: 0,
      skill: 0,
      organization: 0,
      comment: 0,
    },
    candidateFieldFacets: [],
    resultLimit: 24,
    resultsTruncated: false,
    sourceStatuses: [],
  }
}

function discoveryResponse<TDocument = Readonly<Record<string, unknown>>>(
  request: SearchDiscoveryRequest,
  inputMode: 'query' | 'browse',
  page: SearchDiscoveryResponse['page'] = {}
): SearchDiscoveryResponse<TDocument> {
  return {
    context: request.criteria.context,
    schemaVersion: 1,
    canonicalCriteria: structuredClone(request.criteria),
    hits: [
      {
        id: 'task:task-v2',
        entityType: 'task',
        entityId: 'task-v2',
        source: 'tasks',
        rank: 1,
        // The controller only verifies provider-owned presentation in this fixture.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        document: {} as TDocument,
        presentation: {
          title: 'Canonical task result',
          url: '/tasks/task-v2',
          sourceLabel: 'Task title',
          snippets: ['Server-owned task snippet'],
          breadcrumbs: ['Tasks'],
          primaryActionLabel: 'Open task',
        },
      },
    ],
    total: { value: 1, relation: 'eq' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page,
    execution: {
      provider: 'search.tasks.discovery.v1',
      degraded: false,
      partial: false,
      requestId: 'request-task-v2',
    },
    search: {
      scope: 'task',
      inputMode,
      submittedQuery: request.criteria.text?.value ?? '',
      normalizedQuery: request.criteria.text?.value ?? '',
      retrievalMode: 'lexical',
      rankingVersion: 'tasks.lexical.v1',
      searchSessionId: 'session-task-v2',
      requestId: 'request-task-v2',
      diagnostics: [],
      sources: [
        {
          source: 'tasks',
          state: 'ok',
          authority: 'authoritative',
          resultCount: 1,
          total: { value: 1, relation: 'eq' },
          diagnosticCodes: [],
        },
      ],
    },
    authority: {
      hits: { state: 'authoritative', sources: ['tasks'] },
      total: { state: 'authoritative', sources: ['tasks'] },
      facets: [],
    },
  }
}

function makeContext(
  input: (key: string) => unknown,
  rendered: Array<{ props: RenderedProps }>,
  organizationId: string | null = null
) {
  return {
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: organizationId,
    session: { get: () => undefined },
    request: { input, ip: () => '127.0.0.1', header: () => 'test-agent' },
    inertia: {
      render: (_component: string, props: RenderedProps) => rendered.push({ props }),
    },
  }
}

test.group('Unit | HTTP Search Page task Discovery adoption', (group) => {
  let previousEnabled: boolean

  group.setup(() => {
    previousEnabled = searchConfig.enabled
    searchConfig.enabled = true
  })

  group.teardown(() => {
    searchConfig.enabled = previousEnabled
  })

  test('uses the task vertical for q-only requests and forwards its opaque cursor', async ({
    assert,
  }) => {
    const calls: SearchDiscoveryRequest[] = []
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({ search: () => Promise.reject(new Error('legacy search used')) }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest,
          _execCtx: HttpActionContext,
          _options?: DiscoveryOptions
        ) => {
          calls.push(request)
          return Promise.resolve(
            discoveryResponse<TDocument>(request, 'query', { nextCursor: 'next-2' })
          )
        },
      })
    )

    await controller.handle(
      makeContext(
        (key) =>
          ({ q: 'checkout', type: 'task', cursor: 'opaque-page-2' })[key],
        rendered
      ) as never
    )

    assert.deepEqual(calls, [
      {
        criteria: {
          context: 'tasks.discovery.public',
          schemaVersion: 1,
          text: { value: 'checkout' },
          sort: [],
          page: { size: 24, cursor: 'opaque-page-2' },
        },
        search: { scope: 'task', retrievalMode: 'lexical' },
      },
    ])
    assert.equal(rendered[0]?.props.activeType, 'task')
    assert.equal(rendered[0]?.props.discovery?.page.nextCursor, 'next-2')
  })

  test('uses the task vertical for an empty task query instead of showing a fake empty prompt', async ({
    assert,
  }) => {
    const calls: SearchDiscoveryRequest[] = []
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({ search: () => Promise.resolve(emptyLegacyResult('')) }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest,
          _execCtx: HttpActionContext,
          _options?: DiscoveryOptions
        ) => {
          calls.push(request)
          return Promise.resolve(discoveryResponse<TDocument>(request, 'browse'))
        },
      })
    )

    await controller.handle(
      makeContext((key) => ({ type: 'task' })[key], rendered) as never
    )

    assert.deepEqual(calls[0], {
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        sort: [],
        page: { size: 24 },
      },
      search: { scope: 'task', retrievalMode: 'lexical' },
    })
    assert.equal(rendered[0]?.props.query, '')
    assert.isDefined(rendered[0]?.props.discovery)
  })

  test('selects the organization task context when the Search shell has a current organization', async ({
    assert,
  }) => {
    const calls: SearchDiscoveryRequest[] = []
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({ search: () => Promise.reject(new Error('legacy search used')) }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest,
          _execCtx: HttpActionContext,
          _options?: DiscoveryOptions
        ) => {
          calls.push(request)
          return Promise.resolve(discoveryResponse<TDocument>(request, 'query'))
        },
      })
    )

    await controller.handle(
      makeContext((key) => ({ q: 'mine', type: 'task' })[key], rendered, 'org-1') as never
    )

    assert.equal(calls[0]?.criteria.context, 'tasks.discovery.member')
  })

  test('uses the talent context instead of the blended context for Talent search', async ({
    assert,
  }) => {
    const calls: SearchDiscoveryRequest[] = []
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({ search: () => Promise.reject(new Error('legacy search used')) }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest
        ) => {
          calls.push(request)
          return Promise.resolve(discoveryResponse<TDocument>(request, 'query'))
        },
      })
    )

    await controller.handle(
      makeContext((key) => ({ q: 'duy', type: 'talent' })[key], rendered) as never
    )

    assert.deepEqual(calls[0]?.criteria.context, 'talents.discovery.public')
    assert.deepEqual(calls[0]?.search, { scope: 'talent', retrievalMode: 'lexical' })
  })
})
