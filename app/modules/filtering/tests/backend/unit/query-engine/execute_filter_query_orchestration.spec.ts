import { test } from '@japa/runner'

import {
  criteria,
  principal,
  mandatory,
  defaultUserFilter,
  definition,
  FakeExecutor,
  harness,
  captureExecutionError,
} from '../support/execute_filter_query_test_support.js'

import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'


test.group('Execute filter query orchestration', () => {
  test('EXE-005 composes mandatory AND user eligibility before every provider output', async ({
    assert,
  }) => {
    const { query, fakeExecutor } = harness()
    const response = await query.execute<{ id: string }>({
      criteria: criteria(),
      principal,
      requestId: 'req-filter-1',
    })

    assert.lengthOf(fakeExecutor.inputs, 1)
    assert.deepEqual(fakeExecutor.inputs[0]?.eligibilityFilter, {
      kind: 'group',
      combinator: 'and',
      children: [mandatory, criteria().filter],
    })
    assert.deepEqual(fakeExecutor.inputs[0]?.mandatoryFilter, mandatory)
    assert.deepEqual(response.hits, [{ id: 'visible-1' }])
    assert.deepEqual(response.total, { value: 1, relation: 'eq' })
    assert.equal(response.facets[0]?.values[0]?.count, 1)
    assert.deepEqual(response.suggestions, [])
    assert.equal(response.execution.requestId, 'req-filter-1')
    assert.deepEqual(response.canonicalCriteria.filter, criteria().filter)
    assert.notInclude(JSON.stringify(response), 'tenantScope')
    assert.notInclude(JSON.stringify(response), 'tenant-secret-a')
  })

  test('rejects user attempts to filter or negate a server-only permission field', async ({
    assert,
  }) => {
    const { query, fakeExecutor } = harness()
    const error = await captureExecutionError(
      query.execute({
        criteria: criteria({
          filter: {
            kind: 'group',
            combinator: 'and',
            negated: true,
            children: [mandatory, defaultUserFilter()],
          },
        }),
        principal,
        requestId: 'req-hidden-probe',
      })
    )

    assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
    assert.lengthOf(fakeExecutor.inputs, 0)
    assert.notInclude(JSON.stringify(error), 'tenantScope')
    assert.notInclude(JSON.stringify(error), 'tenant-secret-a')
  })

  test('fails closed for unknown/stale context and missing executor profile', async ({
    assert,
  }) => {
    for (const [input, expected] of [
      [criteria({ context: 'unknown.context' }), 'FILTER_CONTEXT_MISMATCH'],
      [criteria({ schemaVersion: 2 }), 'FILTER_SCHEMA_VERSION_MISMATCH'],
    ] as const) {
      const { query, fakeExecutor } = harness()
      const error = await captureExecutionError(
        query.execute({ criteria: input, principal, requestId: 'req-context' })
      )
      assert.equal(error.code, expected)
      assert.lengthOf(fakeExecutor.inputs, 0)
    }

    const missing = harness({ missingExecutor: true })
    const missingError = await captureExecutionError(
      missing.query.execute({ criteria: criteria(), principal, requestId: 'req-profile' })
    )
    assert.equal(missingError.code, 'FILTER_EXECUTOR_UNAVAILABLE')
  })

  test('fails closed with safe diagnostics when context, permission, or executor fails', async ({
    assert,
  }) => {
    const cases = [
      [
        harness({ contextFailure: new Error('context-secret-canary') }),
        'FILTER_CONTEXT_UNAVAILABLE',
      ],
      [
        harness({ permissionFailure: new Error('permission-secret-canary') }),
        'FILTER_PERMISSION_UNAVAILABLE',
      ],
    ] as const
    for (const [subject, code] of cases) {
      const error = await captureExecutionError(
        subject.query.execute({ criteria: criteria(), principal, requestId: 'req-failure' })
      )
      assert.equal(error.code, code)
      assert.notInclude(JSON.stringify(error), 'secret-canary')
      assert.lengthOf(subject.fakeExecutor.inputs, 0)
    }

    const failingExecutor = new FakeExecutor()
    failingExecutor.failure = new Error('executor-secret-canary')
    const subject = harness({ executor: failingExecutor })
    const error = await captureExecutionError(
      subject.query.execute({ criteria: criteria(), principal, requestId: 'req-executor-failure' })
    )
    assert.equal(error.code, 'FILTER_EXECUTOR_UNAVAILABLE')
    assert.notInclude(JSON.stringify(error), 'executor-secret-canary')
  })

  test('times out permission resolution without executing or fabricating empty truth', async ({
    assert,
  }) => {
    const fakeExecutor = new FakeExecutor()
    const query = new ExecuteFilterQuery({
      contextProvider: { getEffectiveDefinition: () => Promise.resolve(definition()) },
      permissionProvider: { buildMandatoryExpression: () => new Promise(() => undefined) },
      executorResolver: { getExecutor: () => fakeExecutor },
      timeoutMs: 5,
      hashGenerator: new NodeFilterHashGenerator(),
    })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-timeout' })
    )
    assert.equal(error.code, 'FILTER_PERMISSION_UNAVAILABLE')
    assert.lengthOf(fakeExecutor.inputs, 0)
  })

  test('rejects cursor/offset conflicts and pagination modes before execution', async ({
    assert,
  }) => {
    for (const request of [
      criteria({ page: { size: 20, cursor: 'cursor', offset: 0 } }),
      criteria({ page: { size: 20, offset: 0 } }),
      criteria({ page: { size: 51 } }),
    ]) {
      const { query, fakeExecutor } = harness()
      const error = await captureExecutionError(
        query.execute({ criteria: request, principal, requestId: 'req-page' })
      )
      assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
      assert.lengthOf(fakeExecutor.inputs, 0)
    }
  })

  test('AST-002 rejects an over-depth expression before provider cost or execution', async ({
    assert,
  }) => {
    const nested = (depth: number): FilterExpression =>
      depth === 0
        ? defaultUserFilter()
        : {
            kind: 'group',
            combinator: 'and',
            children: [nested(depth - 1), defaultUserFilter()],
          }
    const { query, fakeExecutor } = harness()
    const error = await captureExecutionError(
      query.execute({
        criteria: criteria({ filter: nested(4) }),
        principal,
        requestId: 'req-ast-002-depth',
      })
    )

    assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
    assert.equal(fakeExecutor.estimateCalls, 0)
    assert.lengthOf(fakeExecutor.inputs, 0)
  })

  test('uses a dedicated cursor bound without raising the text-query limit', async ({ assert }) => {
    const cursor = `cursor.${'x'.repeat(900)}`
    const fakeExecutor = new FakeExecutor()
    fakeExecutor.result = {
      ...fakeExecutor.result,
      page: { nextCursor: cursor },
    }
    const base = definition()
    const subject = harness({
      executor: fakeExecutor,
      effectiveDefinition: definition({
        limits: {
          ...base.limits,
          maxCursorLength: 2_048,
        },
      }),
    })

    const response = await subject.query.execute({
      criteria: criteria({ page: { size: 20, cursor } }),
      principal,
      requestId: 'req-long-opaque-cursor',
    })

    assert.equal(fakeExecutor.inputs[0]?.criteria.page.cursor, cursor)
    assert.equal(response.page.nextCursor, cursor)

    const textError = await captureExecutionError(
      subject.query.execute({
        criteria: criteria({
          filter: {
            kind: 'condition',
            field: 'title',
            operator: 'exact',
            effect: 'require',
            value: { kind: 'scalar', value: 'x'.repeat(129) },
            unknown: 'exclude',
          },
          page: { size: 20 },
        }),
        principal,
        requestId: 'req-text-limit-still-tight',
      })
    )
    assert.equal(textError.code, 'FILTER_CRITERIA_INVALID')
  })
})
