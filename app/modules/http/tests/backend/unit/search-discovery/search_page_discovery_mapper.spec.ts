import { test } from '@japa/runner'

import { projectSearchDiscoveryPage } from '#modules/http/actions/dtos/search-discovery/search_page_discovery'
import type { SearchDiscoveryResponse } from '#modules/search/public_contracts/search_discovery_contract'

function responseWithHits(
  hits: SearchDiscoveryResponse['hits']
): SearchDiscoveryResponse {
  return {
    context: 'search.blended.global',
    schemaVersion: 1,
    canonicalCriteria: {
      context: 'search.blended.global',
      schemaVersion: 1,
      text: { value: 'checkout' },
      sort: [],
      page: { size: 24 },
    },
    hits,
    total: { value: hits.length, relation: 'eq' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'test',
      degraded: false,
      partial: false,
      requestId: 'mapper-request',
    },
    search: {
      scope: 'all',
      inputMode: 'query',
      submittedQuery: 'checkout',
      normalizedQuery: 'checkout',
      retrievalMode: 'lexical',
      rankingVersion: 'test-v1',
      searchSessionId: 'mapper-session',
      requestId: 'mapper-request',
      diagnostics: [],
      sources: [],
    },
    authority: {
      hits: { state: 'authoritative', sources: [] },
      total: { state: 'authoritative', sources: [] },
      facets: [],
    },
  }
}

test.group('Search page Discovery presentation mapper', () => {
  test('keeps only complete server-owned presentation and strips provider documents', ({ assert }) => {
    const response = responseWithHits([
      {
        id: 'task:1',
        entityType: 'task',
        entityId: 'task-1',
        source: 'tasks',
        rank: 1,
        document: { secret: 'must-not-serialize' },
        presentation: {
          title: 'Canonical task',
          url: '/tasks/task-1',
          sourceLabel: 'Task title',
          snippets: ['Server-owned snippet'],
          breadcrumbs: ['Tasks'],
          primaryActionLabel: 'Open task',
        },
      },
    ])

    const projected = projectSearchDiscoveryPage(response)

    assert.isNotNull(projected)
    assert.deepEqual(projected?.hits[0], {
      id: 'task:1',
      entityType: 'task',
      entityId: 'task-1',
      rank: 1,
      presentation: response.hits[0]?.presentation,
    })
    assert.notInclude(JSON.stringify(projected), 'must-not-serialize')
  })

  test('rejects a hit without presentation instead of deriving a card from its document', ({ assert }) => {
    const response = responseWithHits([
      {
        id: 'task:missing-presentation',
        entityType: 'task',
        entityId: 'task-2',
        source: 'tasks',
        rank: 1,
        document: { title: 'Do not use me' },
      },
    ])

    assert.isNull(projectSearchDiscoveryPage(response))
  })
})
