import { test } from '@japa/runner'

import {
  FaultInjectingSearchIndexCutoverFence,
  type SearchIndexCutoverFencePort,
} from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import {
  PostgresSearchIndexCutoverFence,
  type SearchIndexCutoverTransactionGateway,
} from '#modules/search/infra/adapters/index-administration/postgres_search_index_cutover_fence'

// The fault decorator is intentionally tested through the outbound port. The
// production Postgres adapter remains the transaction boundary; the decorator
// only makes crash points deterministic for activation/reconcile tests.

test.group('Postgres Search index cutover fence', () => {
  test('injects a bounded after-cutover fault once, after the ES callback and before its caller can persist the ledger', async ({ assert }) => {
    const events: string[] = []
    const delegate: SearchIndexCutoverFencePort = {
      runExclusive: async (_aliasName, callback) => {
        events.push('transaction:start')
        const result = await callback()
        events.push('transaction:callback:complete')
        return result
      },
    }
    const fence = new FaultInjectingSearchIndexCutoverFence(delegate, {
      point: 'after_cutover',
      error: new Error('injected crash after alias swap'),
      once: true,
    })

    await assert.rejects(
      () =>
        fence.runExclusive('suar_test_tasks', async () => {
        events.push('es:alias_swap')
        return Promise.resolve('alias-swapped')
        }),
      /injected crash after alias swap/u,
    )
    assert.deepEqual(events, [
      'transaction:start',
      'es:alias_swap',
    ])

    const replayed = await fence.runExclusive('suar_test_tasks', async () => {
      events.push('replay:es:alias_swap')
      return Promise.resolve('replayed')
    })
    assert.equal(replayed, 'replayed')
    assert.deepEqual(events.slice(-3), [
      'transaction:start',
      'replay:es:alias_swap',
      'transaction:callback:complete',
    ])
  })

  test('sets a bounded lock timeout and acquires the alias fence before the callback', async ({
    assert,
  }) => {
    const events: string[] = []
    const queries: Array<{ sql: string; bindings: string[] }> = []
    const gateway: SearchIndexCutoverTransactionGateway = {
      transaction: async (callback) => {
        events.push('transaction:start')
        try {
          return await callback({
            rawQuery: (sql, bindings) => {
              queries.push({ sql, bindings })
              events.push(`query:${String(queries.length)}`)
              return Promise.resolve()
            },
          })
        } finally {
          events.push('transaction:end')
        }
      },
    }
    const fence = new PostgresSearchIndexCutoverFence(gateway)

    const result = await fence.runExclusive('suar_test_tasks', async () => {
      events.push('callback')
      return Promise.resolve('cutover-complete')
    })

    assert.equal(result, 'cutover-complete')
    assert.deepEqual(events, [
      'transaction:start',
      'query:1',
      'query:2',
      'callback',
      'transaction:end',
    ])
    assert.include(queries[0]?.sql, "set_config('lock_timeout', ?, true)")
    assert.deepEqual(queries[0]?.bindings, ['5000ms'])
    assert.include(queries[1]?.sql, 'pg_advisory_xact_lock(hashtext(?), hashtext(?))')
    assert.deepEqual(queries[1]?.bindings, ['suar.search.index_cutover.v1', 'suar_test_tasks'])
  })

  test('keeps callback failure inside the transaction boundary', async ({ assert }) => {
    const events: string[] = []
    const gateway: SearchIndexCutoverTransactionGateway = {
      transaction: async (callback) => {
        events.push('transaction:start')
        try {
          return await callback({
            rawQuery: () => Promise.resolve(),
          })
        } finally {
          events.push('transaction:end')
        }
      },
    }
    const fence = new PostgresSearchIndexCutoverFence(gateway)

    await assert.rejects(
      () =>
        fence.runExclusive('suar_test_tasks', async () => {
          events.push('callback')
          return Promise.reject(new Error('alias update failed'))
        }),
      /alias update failed/
    )
    assert.deepEqual(events, ['transaction:start', 'callback', 'transaction:end'])
  })

  test('rejects an empty alias before opening a transaction', async ({ assert }) => {
    let transactionOpened = false
    const gateway: SearchIndexCutoverTransactionGateway = {
      transaction: () => {
        transactionOpened = true
        return Promise.resolve(undefined as never)
      },
    }
    const fence = new PostgresSearchIndexCutoverFence(gateway)

    await assert.rejects(() => fence.runExclusive('', () => Promise.resolve()), /alias name/)
    assert.isFalse(transactionOpened)
  })
})
