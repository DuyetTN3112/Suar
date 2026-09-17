import { test } from '@japa/runner'

import {
  captureError,
  criteria,
  hit,
  makeTaskVertical,
  PRINCIPAL,
} from '../support/search_discovery_query_test_support.js'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import {
  SEARCH_BLENDED_CONTEXT,
  SEARCH_BLENDED_SOURCE_CAPABILITIES,
  SearchDiscoveryError,
  type SearchDiscoveryHit,
} from '#modules/search/public_contracts/search_discovery_contract'

test.group('Unit | Search Discovery Query - Blended Contexts & Legacy Compatibility', () => {
  test('fails closed when provider explanation version or signal evidence is invalid', async ({
    assert,
  }) => {
    const invalidHit: SearchDiscoveryHit<{ title: string }> = {
      ...hit('task-invalid-explanation'),
      explanation: {
        rankingVersion: 'tasks.lexical.v0',
        contributingSignals: [
          {
            kind: 'text_match',
            field: 'title',
            match: 'term',
            evidence: 'provider',
          },
        ],
      },
    }
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: (input: { criteria: QueryCriteriaRequest; requestId: string }) =>
            Promise.resolve({
              context: input.criteria.context,
              schemaVersion: input.criteria.schemaVersion,
              canonicalCriteria: input.criteria,
              hits: [invalidHit],
              total: { value: 1, relation: 'eq' as const },
              facets: [],
              suggestions: [],
              diagnostics: [],
              page: {},
              execution: {
                provider: 'test',
                degraded: false,
                partial: false,
                requestId: input.requestId,
              },
            }),
        },
      ],
    })
    const error = await captureError(() =>
      query.execute({
        request: { criteria: criteria({ text: { value: 'postgres' } }), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-invalid-explanation',
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_SOURCE_UNAVAILABLE')
  })

  test('rejects a scope/context mismatch before any executor or fallback runs', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    let fallbackCalls = 0
    const query = new SearchDiscoveryQuery({
      verticals: [makeTaskVertical(seen)],
      legacyGlobalSearch: () => {
        fallbackCalls += 1
        return Promise.reject(new Error('must not run'))
      },
    })

    const error = await captureError(() =>
      query.execute({
        request: {
          criteria: criteria({ context: SEARCH_BLENDED_CONTEXT }),
          search: { scope: 'task' },
        },
        principal: PRINCIPAL,
        requestId: 'request-mismatch',
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_SCOPE_CONTEXT_MISMATCH')
    assert.lengthOf(seen, 0)
    assert.equal(fallbackCalls, 0)
  })

  test('fails closed when blended legacy fallback cannot enforce structured criteria', async ({
    assert,
  }) => {
    let fallbackCalls = 0
    const query = new SearchDiscoveryQuery({
      verticals: [],
      legacyGlobalSearch: () => {
        fallbackCalls += 1
        return Promise.reject(new Error('must not run'))
      },
      sessionIdGenerator: () => 'session-generated-0003',
    })
    const requestCriteria = criteria({
      context: SEARCH_BLENDED_CONTEXT,
      text: { value: 'postgres' },
      filter: {
        kind: 'condition',
        field: 'task.difficulty',
        operator: 'eq',
        effect: 'require',
        value: { kind: 'scalar', value: 'advanced' },
        unknown: 'exclude',
      },
      requestedFacets: [{ field: 'task.difficulty', countMode: 'self_excluding' }],
    })

    const result = await query.execute({
      request: { criteria: requestCriteria, search: { scope: 'all' } },
      principal: PRINCIPAL,
      requestId: 'request-fail-closed',
    })

    assert.equal(fallbackCalls, 0)
    assert.lengthOf(result.hits, 0)
    assert.deepEqual(result.total, { value: 0, relation: 'unknown' })
    assert.isTrue(result.execution.degraded)
    assert.isTrue(result.execution.partial)
    assert.equal(result.authority.hits.state, 'unsupported')
    assert.equal(result.authority.total.state, 'unsupported')
    assert.equal(result.authority.facets[0]?.state, 'unsupported')
    assert.deepEqual(
      SEARCH_BLENDED_SOURCE_CAPABILITIES.map(
        ({ source, authoritativeTotal, authoritativeFacetFields, structuredFields }) => ({
          source,
          authoritativeTotal,
          authoritativeFacetFields,
          structuredFields,
        })
      ),
      ['talents', 'tasks', 'projects', 'skills', 'organizations', 'comments'].map((source) => ({
        source,
        authoritativeTotal: false,
        authoritativeFacetFields: [],
        structuredFields: [],
      }))
    )
    assert.deepEqual(
      result.search.sources.map(({ source, state, authority }) => ({ source, state, authority })),
      SEARCH_BLENDED_SOURCE_CAPABILITIES.map(({ source }) => ({
        source,
        state: 'skipped',
        authority: 'unsupported',
      }))
    )
    assert.deepEqual(
      result.authority.total.unsupportedSources,
      SEARCH_BLENDED_SOURCE_CAPABILITIES.map(({ source }) => source)
    )
    assert.deepInclude(result.search.diagnostics, {
      code: 'SEARCH_FALLBACK_UNSAFE',
      severity: 'error',
    })
  })

  test('keeps legacy candidate totals and facets non-authoritative in blended compatibility mode', async ({
    assert,
  }) => {
    const query = new SearchDiscoveryQuery({
      verticals: [],
      sessionIdGenerator: () => 'session-generated-0004',
      legacyGlobalSearch: () =>
        Promise.resolve({
          query: 'postgres',
          talents: [],
          tasks: [],
          projects: [],
          skills: [],
          organizations: [],
          comments: [],
          results: [
            {
              id: 'task:task-1',
              entityType: 'task',
              entityId: 'task-1',
              title: 'PostgreSQL indexing',
              sourceLabel: 'Tasks',
              url: '/tasks/task-1',
              matchedFields: ['title'],
              matchedFieldLabels: ['Title'],
              snippets: [],
              highlightedSnippets: [],
              breadcrumbs: [],
              matchStrength: 'strong',
              rank: 1,
              primaryActionLabel: 'Open task',
              secondaryMeta: null,
            },
          ],
          candidateResultCount: 24,
          candidateTotalByType: {
            all: 24,
            talent: 0,
            task: 24,
            project: 0,
            skill: 0,
            organization: 0,
            comment: 0,
          },
          candidateFieldFacets: [{ label: 'Title', entityType: 'task', count: 24 }],
          resultLimit: 24,
          resultsTruncated: true,
          sourceStatuses: [
            {
              source: 'tasks',
              status: 'ok',
              resultCount: 12,
              errorMessage: null,
              durationMs: 20,
            },
          ],
        }),
    })

    const result = await query.execute({
      request: {
        criteria: criteria({
          context: SEARCH_BLENDED_CONTEXT,
          text: { value: 'postgres' },
        }),
        search: { scope: 'all' },
      },
      principal: PRINCIPAL,
      requestId: 'request-legacy',
    })

    assert.lengthOf(result.hits, 1)
    assert.deepEqual(result.total, { value: 24, relation: 'gte' })
    assert.lengthOf(result.facets, 0)
    assert.equal(result.authority.hits.state, 'partial')
    assert.equal(result.authority.total.state, 'partial')
    assert.deepEqual(result.authority.facets, [])
    assert.equal(result.compatibility?.globalSearch.candidateFieldFacets[0]?.count, 24)
    assert.isTrue(result.execution.degraded)
    assert.isTrue(result.execution.partial)
  })

  test('does not reinterpret empty blended browsing or advanced retrieval through legacy search', async ({
    assert,
  }) => {
    let fallbackCalls = 0
    const query = new SearchDiscoveryQuery({
      verticals: [],
      sessionIdGenerator: () => 'session-generated-0005',
      legacyGlobalSearch: () => {
        fallbackCalls += 1
        return Promise.reject(new Error('must not run'))
      },
    })

    const empty = await query.execute({
      request: {
        criteria: criteria({ context: SEARCH_BLENDED_CONTEXT }),
        search: { scope: 'all' },
      },
      principal: PRINCIPAL,
      requestId: 'request-empty-blended',
    })
    assert.equal(empty.authority.total.state, 'unsupported')
    assert.equal(fallbackCalls, 0)

    const error = await captureError(() =>
      query.execute({
        request: {
          criteria: criteria({
            context: SEARCH_BLENDED_CONTEXT,
            text: { value: 'postgres' },
          }),
          search: { scope: 'all', retrievalMode: 'semantic' },
        },
        principal: PRINCIPAL,
        requestId: 'request-semantic-blended',
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_RETRIEVAL_UNSUPPORTED')
    assert.equal(fallbackCalls, 0)
  })
})
