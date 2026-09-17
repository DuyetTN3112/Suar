import { test } from '@japa/runner'

import {
  captureError,
  criteria,
  makeTaskVertical,
  PRINCIPAL,
} from '../support/search_discovery_query_test_support.js'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'

test.group('Unit | Search Discovery Query - Errors, Aborts & Diagnostics', () => {
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
