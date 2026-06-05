import { test } from '@japa/runner'

import type {
  FilterExecutorInput,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import {
  referenceAuthorizationBinding,
  referenceDefinition,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'

export interface FilterExecutorConformanceAdapter {
  readonly name: string
  readonly paginationMode?: 'cursor' | 'offset'
  readonly setup?: () => void | Promise<void>
  readonly teardown?: () => void | Promise<void>
  createExecutor(
    records: readonly ReferenceFilterRecord[]
  ):
    | FilterQueryExecutor<ReferenceFilterRecord>
    | Promise<FilterQueryExecutor<ReferenceFilterRecord>>
}

const unknown = { kind: 'unknown' } as const
const missing = { kind: 'missing' } as const

export const referenceConformanceRecords: readonly ReferenceFilterRecord[] = [
  {
    id: 'r1',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'TypeScript search platform',
      skills: ['TypeScript', 'typescript', 'Redis'],
      score: 10,
      createdAt: '2026-07-31T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy',
        termIds: ['media:film'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [
          { id: 'a1', fields: { status: 'accepted', score: 9 } },
          { id: 'a2', fields: { status: 'pending', score: 4 } },
        ],
      },
    },
  },
  {
    id: 'r2',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Frontend TypeScript role',
      skills: ['typescript'],
      score: 20,
      createdAt: '2026-07-20T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy',
        termIds: ['media:book'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [{ id: 'a3', fields: { status: 'rejected', score: 2 } }],
      },
    },
  },
  {
    id: 'r3',
    fields: {
      tenant: 'org-a',
      status: 'closed',
      title: 'Known empty metadata record',
      skills: [],
      score: 20,
      createdAt: missing,
      active: false,
      category: missing,
      applications: { kind: 'relation', records: [] },
    },
  },
  {
    id: 'r4',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Unknown skills record',
      skills: unknown,
      score: 30,
      createdAt: '2026-08-02T00:00:00.000Z',
      active: unknown,
      category: unknown,
      applications: { kind: 'relation', records: [] },
    },
  },
  {
    id: 'r5',
    fields: {
      tenant: 'org-a',
      status: 'open',
      title: 'Vue PostgreSQL TypeScript discovery',
      skills: ['vue', 'typescript', 'postgresql'],
      score: 20,
      createdAt: '2026-08-01T12:00:00.000Z',
      active: unknown,
      category: {
        kind: 'hierarchy',
        termIds: ['media:film'],
        ancestorIds: ['media', 'creative'],
      },
      applications: {
        kind: 'relation',
        records: [{ id: 'a4', fields: { status: 'accepted', score: 7 } }],
      },
    },
  },
  {
    id: 'r6',
    fields: {
      tenant: 'org-a',
      status: 'archived',
      title: 'Redis operations archive',
      skills: ['redis'],
      score: 5,
      createdAt: '2025-01-01T00:00:00.000Z',
      active: false,
      category: {
        kind: 'hierarchy',
        termIds: ['operations:database'],
        ancestorIds: ['operations'],
      },
      applications: missing,
    },
  },
  ...['r7', 'r8', 'r9', 'r10'].map((id, index) => ({
    id,
    fields: {
      tenant: 'org-secret',
      status: index % 2 === 0 ? 'open' : 'closed',
      title: `Private acquisition ${index}`,
      skills: ['secret-skill', 'typescript'],
      score: 100 + index,
      createdAt: '2026-07-31T00:00:00.000Z',
      active: true,
      category: {
        kind: 'hierarchy' as const,
        termIds: ['secret:category'],
        ancestorIds: ['secret'],
      },
      applications: { kind: 'relation' as const, records: [] },
    },
  })),
]

export function defineFilterExecutorConformanceSuite(
  adapter: FilterExecutorConformanceAdapter
): void {
  test.group(`Filter executor conformance | ${adapter.name}`, (group) => {
    if (adapter.setup !== undefined) group.setup(adapter.setup)
    if (adapter.teardown !== undefined) group.teardown(adapter.teardown)

    test('advertises every semantic capability exercised by this conformance profile', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const capabilities = executor.describeCapabilities()
      assert.isTrue(capabilities.facets)
      assert.isTrue(capabilities.nestedGroups)
      assert.isTrue(capabilities.preferences)
      assert.isTrue(capabilities.relativeTime)
      assert.isTrue(capabilities.relations)
      assert.include(capabilities.pagination, adapter.paginationMode ?? 'cursor')
      assert.include(capabilities.facetCountModes, 'self_excluding')
      assert.includeMembers(
        [...(capabilities.fieldOperators['skills'] ?? [])],
        ['contains_any', 'contains_all', 'contains_none', 'contains_exactly', 'contains_at_least']
      )
      assert.includeMembers([...capabilities.totalRelations], ['eq'])
    })

    test('applies mandatory authorization to hits, exact totals, facets, and every evidence section', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const input = conformanceInput(executor.profile, {
        requestedFacets: [
          { field: 'status', countMode: 'constrained' },
          { field: 'skills', countMode: 'constrained' },
        ],
      })
      const result = await executor.execute(input)

      assert.deepEqual(
        result.hits.map(({ id }) => id),
        ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']
      )
      assert.deepEqual(result.total, { value: 6, relation: 'eq' })
      assert.notInclude(JSON.stringify(result.facets), 'secret')
      assert.equal(result.provider, executor.profile)
      assert.isFalse(result.degraded)
      assert.isFalse(result.partial)
      assert.strictEqual(result.authorizationEvidence.hits, input.authorizationBinding)
      assert.strictEqual(result.authorizationEvidence.total, input.authorizationBinding)
      assert.strictEqual(result.authorizationEvidence.facets, input.authorizationBinding)
      assert.strictEqual(result.authorizationEvidence.suggestions, input.authorizationBinding)
      assert.strictEqual(result.authorizationEvidence.page, input.authorizationBinding)
    })

    test('matches Any/All/None/Exactly/At-least-N and known-empty versus unknown truth', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const cases: Array<{
        operator: string
        values: FilterScalar[]
        minimumMatch?: number
        unknown?: 'include' | 'exclude'
        expected: string[]
      }> = [
        { operator: 'contains_any', values: ['typescript'], expected: ['r1', 'r2', 'r5'] },
        {
          operator: 'contains_all',
          values: ['typescript', 'redis'],
          expected: ['r1'],
        },
        { operator: 'contains_none', values: ['typescript'], expected: ['r3', 'r6'] },
        { operator: 'contains_exactly', values: ['typescript'], expected: ['r2'] },
        {
          operator: 'contains_at_least',
          values: ['typescript', 'redis', 'vue'],
          minimumMatch: 2,
          expected: ['r1', 'r5'],
        },
        {
          operator: 'contains_any',
          values: ['typescript'],
          unknown: 'include',
          expected: ['r1', 'r2', 'r4', 'r5'],
        },
      ]
      for (const semanticCase of cases) {
        const filter = condition({
          field: 'skills',
          operator: semanticCase.operator,
          unknown: semanticCase.unknown ?? 'exclude',
          value: {
            kind: 'set',
            values: semanticCase.values,
            ...(semanticCase.minimumMatch === undefined
              ? {}
              : { minimumMatch: semanticCase.minimumMatch }),
          },
        })
        const result = await executor.execute(conformanceInput(executor.profile, { filter }))
        assert.deepEqual(
          result.hits.map(({ id }) => id),
          semanticCase.expected,
          semanticCase.operator
        )
      }

      const knownEmpty = await executor.execute(
        conformanceInput(executor.profile, {
          filter: condition({ field: 'skills', operator: 'is_empty' }),
        })
      )
      assert.deepEqual(
        knownEmpty.hits.map(({ id }) => id),
        ['r3']
      )
    })

    test('preserves nested Boolean, numeric/date, hierarchy, and same-relation semantics', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const filter: FilterExpression = {
        kind: 'group',
        combinator: 'and',
        children: [
          condition({ field: 'status', operator: 'eq', value: scalar('open') }),
          {
            kind: 'group',
            combinator: 'or',
            children: [
              condition({ field: 'score', operator: 'gte', value: scalar(20) }),
              condition({
                field: 'applications',
                operator: 'related_matches',
                value: {
                  kind: 'relation',
                  expression: condition({
                    field: 'status',
                    operator: 'eq',
                    value: scalar('accepted'),
                  }),
                  count: { gte: 1 },
                },
              }),
            ],
          },
          condition({
            field: 'category',
            operator: 'within_subtree',
            value: { kind: 'hierarchy', termIds: ['media'], expansion: 'descendants' },
          }),
        ],
      }
      const result = await executor.execute(conformanceInput(executor.profile, { filter }))
      assert.deepEqual(
        result.hits.map(({ id }) => id),
        ['r1', 'r2', 'r5']
      )

      const recent = await executor.execute(
        conformanceInput(executor.profile, {
          filter: condition({
            field: 'createdAt',
            operator: 'within_last',
            value: { kind: 'relative_time', amount: 2, unit: 'day', anchor: 'now' },
          }),
        })
      )
      assert.deepEqual(
        recent.hits.map(({ id }) => id),
        ['r1']
      )

      const dateRange = await executor.execute(
        conformanceInput(executor.profile, {
          filter: condition({
            field: 'createdAt',
            operator: 'between',
            value: {
              kind: 'range',
              gte: '2026-07-30T00:00:00.000Z',
              lte: '2026-08-01T23:59:59.999Z',
            },
          }),
        })
      )
      assert.deepEqual(
        dateRange.hits.map(({ id }) => id),
        ['r1', 'r5']
      )

      const relationMissing = await executor.execute(
        conformanceInput(executor.profile, {
          filter: condition({ field: 'applications', operator: 'related_missing' }),
        })
      )
      assert.deepEqual(
        relationMissing.hits.map(({ id }) => id),
        ['r3', 'r4', 'r6']
      )
    })

    test('computes constrained and valid self-excluding facets from the complete authorized population', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const filter: FilterExpression = {
        kind: 'group',
        combinator: 'and',
        children: [
          condition({ field: 'status', operator: 'eq', value: scalar('open') }),
          condition({
            field: 'skills',
            operator: 'contains_any',
            value: { kind: 'set', values: ['redis'] },
          }),
        ],
      }
      const result = await executor.execute(
        conformanceInput(executor.profile, {
          filter,
          page: { size: 1 },
          requestedFacets: [
            { field: 'skills', countMode: 'constrained' },
            { field: 'skills', countMode: 'self_excluding' },
          ],
        })
      )
      const constrained = result.facets[0]
      const selfExcluding = result.facets[1]
      assert.deepEqual(
        constrained?.values.map(({ value, count }) => [value, count]),
        [
          ['redis', 1],
          ['typescript', 1],
        ]
      )
      assert.deepEqual(
        selfExcluding?.values.map(({ value, count }) => [value, count]),
        [
          ['typescript', 3],
          ['postgresql', 1],
          ['redis', 1],
          ['vue', 1],
        ]
      )
      assert.notInclude(JSON.stringify(result.facets), 'secret-skill')
      assert.lengthOf(result.hits, 1)

      const selectedZero = await executor.execute(
        conformanceInput(executor.profile, {
          filter: condition({
            field: 'skills',
            operator: 'contains_any',
            value: { kind: 'set', values: ['go'] },
          }),
          requestedFacets: [{ field: 'skills', countMode: 'constrained' }],
        })
      )
      assert.deepEqual(selectedZero.facets[0]?.values, [
        {
          value: 'go',
          count: 0,
          countRelation: 'exact',
          selected: true,
        },
      ])
    })

    test('rejects non-extractable self-exclusion instead of inventing a count', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const filter: FilterExpression = {
        kind: 'group',
        combinator: 'or',
        children: [
          condition({
            field: 'skills',
            operator: 'contains_any',
            value: { kind: 'set', values: ['typescript'] },
          }),
          condition({ field: 'status', operator: 'eq', value: scalar('open') }),
        ],
      }
      const error = await executor
        .execute(
          conformanceInput(executor.profile, {
            filter,
            requestedFacets: [{ field: 'skills', countMode: 'self_excluding' }],
          })
        )
        .catch((caught: unknown) => caught)
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    })

    test('keeps preferences in bounded ranking without changing eligibility or explicit sort', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const preference = {
        effect: 'prefer' as const,
        weight: 7,
        expression: condition({
          field: 'skills',
          operator: 'contains_any',
          value: { kind: 'set', values: ['vue'] },
        }),
      }
      const ranked = await executor.execute(
        conformanceInput(executor.profile, { sort: [], preferences: [preference] })
      )
      const explicitlySorted = await executor.execute(
        conformanceInput(executor.profile, {
          sort: [{ field: 'score', direction: 'asc' }],
          preferences: [preference],
        })
      )

      assert.equal(ranked.total.value, 6)
      assert.equal(ranked.hits[0]?.id, 'r5')
      assert.equal(explicitlySorted.total.value, 6)
      assert.equal(explicitlySorted.hits[0]?.id, 'r6')
    })

    test('rejects an already-aborted request without fabricating empty truth', async ({
      assert,
    }) => {
      const executor = await adapter.createExecutor(referenceConformanceRecords)
      const controller = new AbortController()
      controller.abort()
      const error = await executor
        .execute({ ...conformanceInput(executor.profile), signal: controller.signal })
        .catch((caught: unknown) => caught)
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, 'FILTER_REQUEST_ABORTED')
    })

    if ((adapter.paginationMode ?? 'cursor') === 'cursor') {
      test('uses stable ID tie-breaks and rejects tampered or cross-authorization cursors', async ({
        assert,
      }) => {
        const executor = await adapter.createExecutor(referenceConformanceRecords)
        const firstInput = conformanceInput(executor.profile, {
          sort: [{ field: 'score', direction: 'asc' }],
          page: { size: 2 },
        })
        const first = await executor.execute(firstInput)
        assert.deepEqual(
          first.hits.map(({ id }) => id),
          ['r6', 'r1']
        )
        assert.isString(first.page.nextCursor)
        const nextCursor = first.page.nextCursor
        if (nextCursor === undefined) throw new Error('Expected a next cursor')
        assert.notInclude(nextCursor, 'org-a')
        assert.notInclude(nextCursor, 'authorization-v1')

        const secondInput = conformanceInput(executor.profile, {
          sort: [{ field: 'score', direction: 'asc' }],
          page: { size: 2, cursor: nextCursor },
        })
        const second = await executor.execute(secondInput)
        assert.deepEqual(
          second.hits.map(({ id }) => id),
          ['r2', 'r3']
        )
        const thirdCursor = second.page.nextCursor
        if (thirdCursor === undefined) throw new Error('Expected a third page cursor')
        const third = await executor.execute(
          conformanceInput(executor.profile, {
            sort: [{ field: 'score', direction: 'asc' }],
            page: { size: 2, cursor: thirdCursor },
          })
        )
        assert.deepEqual(
          third.hits.map(({ id }) => id),
          ['r5', 'r4']
        )
        assert.isUndefined(third.page.nextCursor)
        assert.deepEqual(
          [...first.hits, ...second.hits, ...third.hits].map(({ id }) => id),
          ['r6', 'r1', 'r2', 'r3', 'r5', 'r4']
        )

        const lastCharacter = nextCursor.at(-1)
        const tampered = `${nextCursor.slice(0, -1)}${lastCharacter === 'x' ? 'y' : 'x'}`
        const tamperedError = await executor
          .execute(
            conformanceInput(executor.profile, {
              sort: [{ field: 'score', direction: 'asc' }],
              page: { size: 2, cursor: tampered },
            })
          )
          .catch((caught: unknown) => caught)
        assert.instanceOf(tamperedError, FilterExecutionError)
        assert.equal((tamperedError as FilterExecutionError).code, 'FILTER_CURSOR_INVALID')

        const crossAuthorization = await executor
          .execute({
            ...secondInput,
            authorizationBinding: referenceAuthorizationBinding({
              authorizationVersion: 'authorization-v2',
            }),
          })
          .catch((caught: unknown) => caught)
        assert.instanceOf(crossAuthorization, FilterExecutionError)
        assert.equal((crossAuthorization as FilterExecutionError).code, 'FILTER_CURSOR_INVALID')
      })
    } else {
      test('uses stable ID tie-breaks for offset pages without duplicate or skip', async ({
        assert,
      }) => {
        const executor = await adapter.createExecutor(referenceConformanceRecords)
        const pages = await Promise.all(
          [0, 2, 4].map((offset) =>
            executor.execute(
              conformanceInput(executor.profile, {
                sort: [{ field: 'score', direction: 'asc' }],
                page: { size: 2, offset },
              })
            )
          )
        )
        assert.deepEqual(
          pages.flatMap(({ hits }) => hits.map(({ id }) => id)),
          ['r6', 'r1', 'r2', 'r3', 'r5', 'r4']
        )
        assert.isTrue(pages.every(({ total }) => total.value === 6 && total.relation === 'eq'))
      })
    }
  })
}

export function conformanceInput(
  profile: string,
  criteriaOverrides: Partial<FilterExecutorInput['criteria']> = {}
): FilterExecutorInput {
  const definition = referenceDefinition(profile)
  const mandatoryFilter = condition({
    field: 'tenant',
    operator: 'eq',
    value: scalar('org-a'),
  })
  const criteria = {
    context: definition.key,
    schemaVersion: definition.version,
    sort: [{ field: 'id', direction: 'asc' as const }],
    page: { size: 100 },
    ...criteriaOverrides,
  }
  const eligibilityFilter = compose(mandatoryFilter, criteria.filter)
  return {
    definition,
    criteria,
    mandatoryFilter,
    eligibilityFilter,
    authorizationBinding: referenceAuthorizationBinding(),
    requestId: 'conformance-request-1',
  }
}

function condition(
  overrides: Partial<FilterCondition> & Pick<FilterCondition, 'field' | 'operator'>
): FilterCondition {
  return {
    kind: 'condition',
    effect: 'require',
    unknown: 'exclude',
    ...overrides,
  }
}

function scalar(value: FilterScalar) {
  return { kind: 'scalar' as const, value }
}

function compose(
  mandatory: FilterExpression,
  user: FilterExpression | undefined
): FilterExpression {
  return user === undefined
    ? mandatory
    : { kind: 'group', combinator: 'and', children: [mandatory, user] }
}
