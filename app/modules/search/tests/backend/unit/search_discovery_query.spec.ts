import { test } from '@japa/runner'

import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import {
  SEARCH_BLENDED_CONTEXT,
  SEARCH_BLENDED_SOURCE_CAPABILITIES,
  SearchDiscoveryError,
  type SearchDiscoveryHit,
} from '#modules/search/public_contracts/search_discovery_contract'

const PRINCIPAL: FilterPrincipal = { kind: 'anonymous' }

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: 'tasks.discovery.public',
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    ...overrides,
  }
}

function hit(id: string): SearchDiscoveryHit<{ title: string }> {
  return {
    id: `task:${id}`,
    entityType: 'task',
    entityId: id,
    source: 'tasks',
    rank: 1,
    score: 7,
    document: { title: 'PostgreSQL indexing' },
  }
}

async function captureError(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation()
    return undefined
  } catch (error) {
    return error
  }
}

function makeTaskVertical(
  seen: QueryCriteriaRequest[],
  canonicalize: (input: QueryCriteriaRequest) => QueryCriteriaRequest = (input) => input
) {
  return {
    scope: 'task' as const,
    source: 'tasks' as const,
    contexts: ['tasks.discovery.public', 'tasks.discovery.member'],
    rankingVersion: 'tasks.lexical.v1',
    supportedRetrievalModes: ['auto', 'lexical'] as const,
    execute: (input: {
      criteria: QueryCriteriaRequest
      principal: FilterPrincipal
      requestId: string
      signal?: AbortSignal
    }) => {
      seen.push(input.criteria)
      return Promise.resolve({
        context: input.criteria.context,
        schemaVersion: input.criteria.schemaVersion,
        canonicalCriteria: canonicalize(input.criteria),
        hits: [hit('task-1')],
        total: { value: 73, relation: 'eq' as const },
        facets: [
          {
            field: 'taxonomy.requiredSkills',
            countMode: 'self_excluding' as const,
            values: [
              {
                value: 'skill-postgresql',
                count: 29,
                selected: false,
                countRelation: 'exact' as const,
              },
            ],
          },
        ],
        suggestions: [],
        diagnostics: [],
        page: { nextCursor: 'opaque.next.cursor' },
        execution: {
          provider: 'elasticsearch',
          degraded: false,
          partial: false,
          requestId: input.requestId,
        },
      })
    },
  }
}

test.group('Unit | Search Discovery Query', () => {
  test('delegates q-only, filter-only, combined, and allowed empty criteria distinctly', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [makeTaskVertical(seen)],
      sessionIdGenerator: () => 'session-generated-0001',
    })
    const cases: Array<{
      expectedMode: 'query' | 'filter' | 'combined' | 'browse'
      value: QueryCriteriaRequest
    }> = [
      { expectedMode: 'query', value: criteria({ text: { value: '  postgres  ' } }) },
      {
        expectedMode: 'filter',
        value: criteria({
          filter: {
            kind: 'condition',
            field: 'task.difficulty',
            operator: 'eq',
            effect: 'require',
            value: { kind: 'scalar', value: 'advanced' },
            unknown: 'exclude',
          },
        }),
      },
      {
        expectedMode: 'combined',
        value: criteria({
          text: { value: 'postgres' },
          filter: {
            kind: 'condition',
            field: 'taxonomy.requiredSkills',
            operator: 'contains_any',
            effect: 'require',
            value: { kind: 'set', values: ['skill-postgresql'] },
            unknown: 'exclude',
          },
        }),
      },
      { expectedMode: 'browse', value: criteria() },
    ]

    for (const [index, current] of cases.entries()) {
      const result = await query.execute({
        request: { criteria: current.value, search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: `request-${index}`,
      })

      assert.strictEqual(seen[index], current.value)
      assert.equal(result.search.inputMode, current.expectedMode)
      assert.equal(result.total.value, 73)
      assert.equal(result.authority.total.state, 'authoritative')
      assert.equal(result.authority.facets[0]?.state, 'authoritative')
      assert.equal(result.page.nextCursor, 'opaque.next.cursor')
    }
  })

  test('TC-FST-004 leaves empty-request policy decisions to the Search context executor', async ({
    assert,
  }) => {
    const emptyRequest = criteria({ filter: undefined, preferences: undefined, sort: [] })
    const defaultFilter = {
      kind: 'condition' as const,
      field: 'task.difficulty',
      operator: 'eq',
      effect: 'require' as const,
      value: { kind: 'scalar' as const, value: 'advanced' },
      unknown: 'exclude' as const,
    }
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical(seen),
          execute: async (input) => {
            seen.push(input.criteria)
            if (input.criteria.context === 'tasks.discovery.public') {
              return makeTaskVertical([]).execute(input)
            }
            return Promise.reject(new FilterExecutionError('FILTER_CRITERIA_INVALID'))
          },
        },
      ],
    })

    const browseResponse = await query.execute({
      request: { criteria: emptyRequest, search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-empty-context-browse',
    })
    assert.equal(browseResponse.search.inputMode, 'browse')
    assert.strictEqual(seen[0], emptyRequest)

    const defaultQuery = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: (input) =>
            makeTaskVertical([]).execute({
              ...input,
              criteria: { ...input.criteria, filter: defaultFilter },
            }),
        },
      ],
    })
    const defaultResponse = await defaultQuery.execute({
      request: { criteria: emptyRequest, search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-empty-context-default',
    })
    assert.deepEqual(defaultResponse.canonicalCriteria.filter, defaultFilter)

    const rejectQuery = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: () => Promise.reject(new FilterExecutionError('FILTER_CRITERIA_INVALID')),
        },
      ],
    })
    const error = await captureError(() =>
      rejectQuery.execute({
        request: { criteria: emptyRequest, search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-empty-context-reject',
      })
    )
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CRITERIA_INVALID')
  })

  test('returns canonical Filter criteria and stable server-owned identifiers', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [
        makeTaskVertical(seen, (input) => ({
          ...input,
          text: { value: 'postgres' },
          sort: [{ field: 'task.updatedAt', direction: 'desc' }],
        })),
      ],
      sessionIdGenerator: () => 'session-generated-0002',
    })

    const result = await query.execute({
      request: {
        criteria: criteria({ text: { value: '  postgres  ' } }),
        search: { scope: 'task', retrievalMode: 'lexical' },
      },
      principal: PRINCIPAL,
      requestId: 'request-stable-1',
      searchSessionId: 'session-client-continued-1',
    })

    assert.equal(result.canonicalCriteria.text?.value, 'postgres')
    assert.deepEqual(result.canonicalCriteria.sort, [
      { field: 'task.updatedAt', direction: 'desc' },
    ])
    assert.equal(result.search.submittedQuery, '  postgres  ')
    assert.equal(result.search.normalizedQuery, 'postgres')
    assert.equal(result.search.requestId, 'request-stable-1')
    assert.equal(result.search.searchSessionId, 'session-client-continued-1')
    assert.equal(result.search.rankingVersion, 'tasks.lexical.v1')
    assert.equal(result.search.retrievalMode, 'lexical')
  })

  test('passes through provider explanation and never infers one from score', async ({ assert }) => {
    const explainedHit: SearchDiscoveryHit<{ title: string }> = {
      ...hit('task-explained'),
      explanation: {
        rankingVersion: 'tasks.lexical.v1',
        contributingSignals: [
          {
            kind: 'text_match',
            field: 'title',
            match: 'phrase',
            evidence: 'provider',
          },
          {
            kind: 'strict_filter',
            field: 'task.difficulty',
            operator: 'eq',
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
              hits: [explainedHit],
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

    const result = await query.execute({
      request: { criteria: criteria({ text: { value: 'postgres' } }), search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-explanation',
    })

    assert.deepEqual(result.hits[0]?.explanation, explainedHit.explanation)

    const noEvidenceQuery = new SearchDiscoveryQuery({
      verticals: [makeTaskVertical([])],
    })
    const noEvidenceResult = await noEvidenceQuery.execute({
      request: { criteria: criteria({ text: { value: 'postgres' } }), search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-no-inference',
    })
    assert.isUndefined(noEvidenceResult.hits[0]?.explanation)
  })

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

  test('forwards abort and opaque cursor state to the authoritative vertical', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const controller = new AbortController()
    const vertical = makeTaskVertical(seen)
    const query = new SearchDiscoveryQuery({ verticals: [vertical] })
    const requestCriteria = criteria({ page: { size: 20, cursor: 'opaque.cursor.page.2' } })

    await query.execute({
      request: { criteria: requestCriteria, search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-cursor',
      signal: controller.signal,
    })
    assert.equal(seen[0]?.page.cursor, 'opaque.cursor.page.2')

    controller.abort()
    const error = await captureError(() =>
      query.execute({
        request: { criteria: requestCriteria, search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-aborted',
        signal: controller.signal,
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_REQUEST_ABORTED')
    assert.lengthOf(seen, 1)
  })

  test('maps an in-flight provider abort to the stable Search error contract', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const controller = new AbortController()
    const vertical = makeTaskVertical(seen)
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: (input) =>
            new Promise<Awaited<ReturnType<typeof vertical.execute>>>((_resolve, reject) => {
              seen.push(input.criteria)
              input.signal?.addEventListener(
                'abort',
                () => reject(new FilterExecutionError('FILTER_REQUEST_ABORTED')),
                { once: true }
              )
            }),
        },
      ],
    })

    const pending = query.execute({
      request: { criteria: criteria(), search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-aborted-in-flight',
      signal: controller.signal,
    })
    controller.abort()

    const error = await captureError(() => pending)
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_REQUEST_ABORTED')
    assert.lengthOf(seen, 1)
  })

  test('sanitizes an unknown vertical failure without hiding stable Search failures', async ({
    assert,
  }) => {
    const vertical = makeTaskVertical([])
    const unavailable = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: () => Promise.reject(new Error('provider endpoint and credentials')),
        },
      ],
    })
    const rawError = await captureError(() =>
      unavailable.execute({
        request: { criteria: criteria(), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-provider-unavailable',
      })
    )
    assert.instanceOf(rawError, SearchDiscoveryError)
    assert.equal((rawError as SearchDiscoveryError).code, 'SEARCH_SOURCE_UNAVAILABLE')
    assert.notInclude((rawError as Error).message, 'credentials')

    const timeoutFailure = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: () => Promise.reject(new FilterExecutionError('FILTER_PROVIDER_TIMED_OUT')),
        },
      ],
    })
    const timeoutError = await captureError(() =>
      timeoutFailure.execute({
        request: { criteria: criteria(), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-provider-timeout',
      })
    )
    assert.instanceOf(timeoutError, SearchDiscoveryError)
    assert.equal((timeoutError as SearchDiscoveryError).code, 'SEARCH_SOURCE_TIMED_OUT')

    const staleMappingFailure = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: () =>
            Promise.reject(new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')),
        },
      ],
    })
    const staleMappingError = await captureError(() =>
      staleMappingFailure.execute({
        request: { criteria: criteria(), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-stale-mapping',
      })
    )
    assert.instanceOf(staleMappingError, SearchDiscoveryError)
    assert.equal((staleMappingError as SearchDiscoveryError).code, 'SEARCH_INDEX_STALE')

    for (const [filterCode, searchCode] of [
      ['FILTER_CURSOR_INVALID', 'SEARCH_CURSOR_INVALID'],
      ['FILTER_CURSOR_EXPIRED', 'SEARCH_CURSOR_EXPIRED'],
      ['FILTER_CURSOR_STALE', 'SEARCH_CURSOR_STALE'],
    ] as const) {
      const cursorFailure = new SearchDiscoveryQuery({
        verticals: [
          {
            ...vertical,
            execute: () => Promise.reject(new FilterExecutionError(filterCode)),
          },
        ],
      })
      const error = await captureError(() =>
        cursorFailure.execute({
          request: { criteria: criteria(), search: { scope: 'task' } },
          principal: PRINCIPAL,
          requestId: `request-${filterCode}`,
        })
      )
      assert.instanceOf(error, SearchDiscoveryError)
      assert.equal((error as SearchDiscoveryError).code, searchCode)
    }

    const stableFailure = new SearchDiscoveryError('SEARCH_SOURCE_TIMED_OUT')
    const timedOut = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: () => Promise.reject(stableFailure),
        },
      ],
    })
    const stableError = await captureError(() =>
      timedOut.execute({
        request: { criteria: criteria(), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-source-timeout',
      })
    )
    assert.strictEqual(stableError, stableFailure)
  })

  test('marks a degraded vertical contribution partial even when hits are internally complete', async ({
    assert,
  }) => {
    const vertical = makeTaskVertical([])
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: (input) =>
            vertical.execute(input).then((response) => ({
              ...response,
              diagnostics: [
                {
                  code: 'FILTER_PROVIDER_DEGRADED' as const,
                  severity: 'warning' as const,
                  field: 'task.difficulty',
                },
              ],
              execution: { ...response.execution, degraded: true, partial: false },
            })),
        },
      ],
    })

    const result = await query.execute({
      request: {
        criteria: criteria({
          requestedFacets: [{ field: 'task.difficulty', countMode: 'constrained' }],
        }),
        search: { scope: 'task' },
      },
      principal: PRINCIPAL,
      requestId: 'request-degraded-vertical',
    })

    assert.equal(result.search.sources[0]?.state, 'partial')
    assert.equal(result.search.sources[0]?.authority, 'partial')
    assert.deepInclude(result.search.diagnostics, {
      code: 'SEARCH_PARTIAL_RESULTS',
      severity: 'warning',
      source: 'tasks',
      field: 'task.difficulty',
    })
    assert.deepInclude(result.authority.facets, {
      field: 'task.difficulty',
      state: 'partial',
      sources: ['tasks'],
    })
  })

  test('rejects unavailable retrieval modes without silently downgrading', async ({ assert }) => {
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({ verticals: [makeTaskVertical(seen)] })

    const error = await captureError(() =>
      query.execute({
        request: {
          criteria: criteria({ text: { value: 'postgres' } }),
          search: { scope: 'task', retrievalMode: 'semantic' },
        },
        principal: PRINCIPAL,
        requestId: 'request-semantic',
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_RETRIEVAL_UNSUPPORTED')
    assert.lengthOf(seen, 0)
  })

  test('rejects duplicate or cross-source hit identities from a vertical adapter', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const vertical = makeTaskVertical(seen)
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...vertical,
          execute: (input) =>
            vertical.execute(input).then((response) => {
              const firstHit = response.hits[0]
              if (firstHit === undefined) throw new Error('Expected fixture hit')
              return {
                ...response,
                hits: [firstHit, { ...firstHit, entityType: 'project' as const }],
              }
            }),
        },
      ],
    })

    const error = await captureError(() =>
      query.execute({
        request: { criteria: criteria(), search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-invalid-source-hit',
      })
    )
    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_SOURCE_UNAVAILABLE')
  })
})
