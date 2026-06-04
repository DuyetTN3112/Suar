import { test } from '@japa/runner'

import type {
  FilterExecutorInput,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import {
  defineFilterExecutorConformanceSuite,
  referenceConformanceRecords,
} from '#modules/filtering/tests/backend/contract/support/filter_executor_conformance'
import {
  ReferenceFilterEvaluator,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'

class NamedReferenceExecutor implements FilterQueryExecutor<ReferenceFilterRecord> {
  readonly #delegate: ReferenceFilterEvaluator

  constructor(
    public readonly profile: string,
    records: readonly ReferenceFilterRecord[]
  ) {
    this.#delegate = new ReferenceFilterEvaluator({ records, profile })
  }

  describeCapabilities() {
    return this.#delegate.describeCapabilities()
  }

  estimateCost(input: FilterExecutorInput) {
    return this.#delegate.estimateCost(input)
  }

  execute(input: FilterExecutorInput) {
    return this.#delegate.execute(input)
  }
}

for (const profile of ['reference', 'fake-sql', 'fake-search']) {
  defineFilterExecutorConformanceSuite({
    name: profile,
    paginationMode: profile === 'fake-sql' ? 'offset' : 'cursor',
    createExecutor: (records) => new NamedReferenceExecutor(profile, records),
  })
}

test.group('Reference filter evaluator result truth modes', () => {
  test('preserves exact, bounded, and unknown total relations without relabeling them', async ({
    assert,
  }) => {
    for (const total of [
      { relation: 'eq' as const },
      { relation: 'gte' as const, bound: 2 },
      { relation: 'unknown' as const },
    ]) {
      const executor = new ReferenceFilterEvaluator({
        records: referenceConformanceRecords,
        profile: `reference-${total.relation}`,
        total,
      })
      const result = await executor.execute(executor.createConformanceInput())
      assert.equal(result.total.relation, total.relation)
      if (total.relation === 'eq') assert.equal(result.total.value, result.hits.length)
      if (total.relation === 'gte') {
        assert.isAtMost(result.total.value, referenceConformanceRecords.length)
        assert.isAtLeast(result.total.value, 0)
      }
      if (total.relation === 'unknown') assert.equal(result.total.value, 0)
    }
  })

  test('exposes explicit degraded/partial truth and rejects abort without fabricated empty results', async ({
    assert,
  }) => {
    const degraded = new ReferenceFilterEvaluator({
      records: referenceConformanceRecords,
      profile: 'reference-degraded',
      degraded: true,
      partial: true,
    })
    const degradedResult = await degraded.execute(degraded.createConformanceInput())
    assert.isTrue(degradedResult.degraded)
    assert.isTrue(degradedResult.partial)
    assert.equal(degradedResult.diagnostics[0]?.code, 'FILTER_PROVIDER_DEGRADED')

    const controller = new AbortController()
    controller.abort()
    const error = await degraded
      .execute({ ...degraded.createConformanceInput(), signal: controller.signal })
      .catch((caught: unknown) => caught)
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_REQUEST_ABORTED')
  })

  test('rejects an expired signed cursor instead of silently restarting page one', async ({
    assert,
  }) => {
    let now = new Date('2026-08-01T00:00:00.000Z')
    const executor = new ReferenceFilterEvaluator({
      records: referenceConformanceRecords,
      profile: 'reference-expiry',
      cursorTtlMs: 10,
      clock: () => new Date(now),
    })
    const firstInput = executor.createConformanceInput({
      criteria: {
        ...executor.createConformanceInput().criteria,
        page: { size: 2 },
      },
    })
    const first = await executor.execute(firstInput)
    const cursor = first.page.nextCursor
    if (cursor === undefined) throw new Error('Expected an expiring cursor')
    now = new Date(now.getTime() + 11)

    const error = await executor
      .execute({
        ...firstInput,
        criteria: { ...firstInput.criteria, page: { size: 2, cursor } },
      })
      .catch((caught: unknown) => caught)
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CURSOR_EXPIRED')
  })
})
