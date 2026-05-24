import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import type { SearchPageDiscoveryModel } from '#modules/http/actions/dtos/search-discovery/search_page_discovery'
import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import SearchPageController from '#modules/http/controllers/search-discovery/search_page_controller'
import type { GlobalSearchResult } from '#modules/search/public_contracts/global_search_contract'
import {
  SearchDiscoveryError,
  type SearchDiscoveryRequest,
  type SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

interface RenderedProps {
  query?: string
  results?: GlobalSearchResult['results']
  discovery?: SearchPageDiscoveryModel
  discoveryFailure?: { code: string }
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

test.group('Unit | HTTP Search Page Discovery migration', (group) => {
  let previousEnabled: boolean

  group.setup(() => {
    previousEnabled = searchConfig.enabled
  })

  group.teardown(() => {
    searchConfig.enabled = previousEnabled
  })

  test('uses canonical Discovery for enabled keyword-only all-domain requests', async ({
    assert,
  }) => {
    searchConfig.enabled = true
    const calls: SearchDiscoveryRequest[] = []
    const rendered: Array<{ props: RenderedProps }> = []
    const compatibilityResult: GlobalSearchResult = {
      query: 'checkout',
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
    const discoveryResponse: SearchDiscoveryResponse = {
      context: 'search.blended.global',
      schemaVersion: 1,
      canonicalCriteria: {
        context: 'search.blended.global',
        schemaVersion: 1,
        text: { value: 'checkout' },
        sort: [],
        page: { size: 24 },
      },
      hits: [
        {
          id: 'task:task-v2',
          entityType: 'task',
          entityId: 'task-v2',
          source: 'tasks',
          rank: 1,
          document: { title: 'Raw title must not cross the boundary' },
          presentation: {
            title: 'Canonical Discovery task',
            url: '/tasks/task-v2',
            sourceLabel: 'Task title',
            snippets: ['Server-owned Discovery snippet'],
            breadcrumbs: ['Discovery', 'Tasks'],
            primaryActionLabel: 'Open task',
          },
        },
      ],
      total: { value: 0, relation: 'gte' },
      facets: [],
      suggestions: [],
      diagnostics: [],
      page: {},
      execution: {
        provider: 'legacy.global_search',
        degraded: true,
        partial: true,
        requestId: 'request-1',
      },
      search: {
        scope: 'all',
        inputMode: 'query',
        submittedQuery: 'checkout',
        normalizedQuery: 'checkout',
        retrievalMode: 'lexical',
        rankingVersion: 'weighted_rrf_v1',
        searchSessionId: 'session-1234567890',
        requestId: 'request-1',
        diagnostics: [],
        sources: [],
      },
      authority: {
        hits: { state: 'partial', sources: [] },
        total: { state: 'partial', sources: [] },
        facets: [],
      },
      compatibility: { globalSearch: compatibilityResult },
    }
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({
        search: () => Promise.reject(new Error('legacy search should not be called')),
      }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest
        ): Promise<SearchDiscoveryResponse<TDocument>> => {
          calls.push(request)
          return Promise.resolve(discoveryResponse as SearchDiscoveryResponse<TDocument>)
        },
      })
    )

    // The controller test supplies only the HTTP members used by this boundary.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    await controller.handle({
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: null,
      session: { get: () => undefined },
      request: {
        input: (key: string) => (key === 'q' ? 'checkout' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      inertia: {
        render: (_component: string, props: RenderedProps) => rendered.push({ props }),
      },
    } as never)

    assert.lengthOf(calls, 1)
    assert.deepEqual(calls[0], {
      criteria: {
        context: 'search.blended.global',
        schemaVersion: 1,
        text: { value: 'checkout' },
        sort: [],
        page: { size: 24 },
      },
      search: { scope: 'all', retrievalMode: 'lexical' },
    })
    assert.equal(rendered[0]?.props.query, 'checkout')
    assert.deepEqual(rendered[0]?.props.discovery?.hits, [
      {
        id: 'task:task-v2',
        entityType: 'task',
        entityId: 'task-v2',
        rank: 1,
        presentation: {
          title: 'Canonical Discovery task',
          url: '/tasks/task-v2',
          sourceLabel: 'Task title',
          snippets: ['Server-owned Discovery snippet'],
          breadcrumbs: ['Discovery', 'Tasks'],
          primaryActionLabel: 'Open task',
        },
      },
    ])
    assert.notInclude(
      JSON.stringify(rendered[0]?.props.discovery),
      'Raw title must not cross the boundary'
    )
  })

  test('passes an opaque URL cursor to Discovery without restarting at page one', async ({
    assert,
  }) => {
    searchConfig.enabled = true
    const calls: SearchDiscoveryRequest[] = []
    const compatibilityResult: GlobalSearchResult = {
      query: 'checkout',
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
    const discoveryResponse = {
      context: 'search.blended.global' as const,
      schemaVersion: 1,
      canonicalCriteria: {
        context: 'search.blended.global',
        schemaVersion: 1,
        text: { value: 'checkout' },
        sort: [],
        page: { size: 24, cursor: 'opaque-page-2' },
      },
      hits: [],
      total: { value: 2, relation: 'eq' as const },
      facets: [],
      suggestions: [],
      diagnostics: [],
      page: { previousCursor: 'opaque-page-1', nextCursor: 'opaque-page-3' },
      execution: {
        provider: 'search.tasks.discovery.v1',
        degraded: false,
        partial: false,
        requestId: 'request-page-2',
      },
      search: {
        scope: 'all' as const,
        inputMode: 'query' as const,
        submittedQuery: 'checkout',
        normalizedQuery: 'checkout',
        retrievalMode: 'lexical' as const,
        rankingVersion: 'weighted_rrf_v1',
        searchSessionId: 'session-1234567890',
        requestId: 'request-page-2',
        diagnostics: [],
        sources: [],
      },
      authority: {
        hits: { state: 'authoritative' as const, sources: [] },
        total: { state: 'authoritative' as const, sources: [] },
        facets: [],
      },
      compatibility: { globalSearch: compatibilityResult },
    }
    const rendered: Array<{ props: RenderedProps & { discovery?: SearchPageDiscoveryModel } }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({
        search: () => Promise.reject(new Error('legacy search should not be called')),
      }),
      new GetSearchDiscoveryQuery({
        discover: <TDocument = Readonly<Record<string, unknown>>>(
          request: SearchDiscoveryRequest
        ) => {
          calls.push(request)
          return Promise.resolve(discoveryResponse as SearchDiscoveryResponse<TDocument>)
        },
      })
    )

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    await controller.handle({
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: null,
      session: { get: () => undefined },
      request: {
        input: (key: string) => {
          if (key === 'q') return 'checkout'
          if (key === 'cursor') return 'opaque-page-2'
          if (key === 'previousCursor') return 'opaque-page-1'
          return undefined
        },
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      inertia: {
        render: (
          _component: string,
          props: RenderedProps & { discovery?: SearchPageDiscoveryModel }
        ) => rendered.push({ props }),
      },
    } as never)

    assert.deepEqual(calls[0]?.criteria.page, { size: 24, cursor: 'opaque-page-2' })
    assert.deepEqual(rendered[0]?.props.discovery?.page, {
      previousCursor: 'opaque-page-1',
      nextCursor: 'opaque-page-3',
    })
    assert.equal(rendered[0]?.props.cursor, 'opaque-page-2')
    assert.equal(rendered[0]?.props.previousCursor, 'opaque-page-1')
  })

  test('falls back to the legacy page for retryable Discovery failures', async ({ assert }) => {
    searchConfig.enabled = true
    const legacyResult: GlobalSearchResult = {
      query: 'checkout',
      talents: [],
      tasks: [],
      projects: [],
      skills: [],
      organizations: [],
      comments: [],
      results: [
        {
          id: 'legacy:task-1',
          entityType: 'task',
          entityId: 'task-1',
          title: 'Legacy fallback task',
          sourceLabel: 'Task title',
          url: '/tasks/task-1',
          matchedFields: ['title'],
          matchedFieldLabels: ['Task title'],
          snippets: ['Legacy result'],
          highlightedSnippets: [],
          breadcrumbs: [],
          matchStrength: 'exact',
          rank: 1,
          primaryActionLabel: 'Open task',
          secondaryMeta: null,
        },
      ],
      candidateResultCount: 1,
      candidateTotalByType: {
        all: 1,
        talent: 0,
        task: 1,
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
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({ search: () => Promise.resolve(legacyResult) }),
      new GetSearchDiscoveryQuery({
        discover: () => Promise.reject(new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')),
      })
    )

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    await controller.handle({
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: null,
      session: { get: () => undefined },
      request: {
        input: (key: string) => (key === 'q' ? 'checkout' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      inertia: {
        render: (_component: string, props: RenderedProps) => rendered.push({ props }),
      },
    } as never)

    assert.equal(rendered[0]?.props.results?.[0]?.title, 'Legacy fallback task')
    assert.isUndefined(rendered[0]?.props.discovery)
    assert.deepEqual(rendered[0]?.props.discoveryFailure, { code: 'SEARCH_SOURCE_UNAVAILABLE' })
  })

  test('uses legacy search for page filters without a Discovery vertical', async ({ assert }) => {
    searchConfig.enabled = true
    const discoveryCalls: SearchDiscoveryRequest[] = []
    const legacyCalls: Array<{ query: string; entityTypes?: readonly string[] }> = []
    const rendered: Array<{ props: RenderedProps }> = []
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({
        search: (query, _context, options) => {
          legacyCalls.push({ query, entityTypes: options?.entityTypes })
          return Promise.resolve({
            ...emptyLegacyResult(query),
            candidateResultCount: 1,
            candidateTotalByType: {
              ...emptyLegacyResult(query).candidateTotalByType,
              all: 1,
              project: 1,
            },
          })
        },
      }),
      new GetSearchDiscoveryQuery({
        discover: (request) => {
          discoveryCalls.push(request)
          return Promise.reject(new Error('Discovery must not receive project scope'))
        },
      })
    )

    await controller.handle({
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: null,
      session: { get: () => undefined },
      request: {
        input: (key: string) => ({ q: 'duyet', type: 'project' })[key],
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      inertia: {
        render: (_component: string, props: RenderedProps) => rendered.push({ props }),
      },
    } as never)

    assert.deepEqual(discoveryCalls, [])
    assert.deepEqual(legacyCalls, [{ query: 'duyet', entityTypes: ['project'] }])
    assert.isUndefined(rendered[0]?.props.discovery)
  })

})
