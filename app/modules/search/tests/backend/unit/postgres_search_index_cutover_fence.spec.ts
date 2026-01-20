import { test } from '@japa/runner'

import {
  PostgresSearchIndexCutoverFence,
  type SearchIndexCutoverTransactionGateway,
} from '#modules/search/infra/adapters/postgres_search_index_cutover_fence'

test.group('Postgres Search index cutover fence', () => {
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

    const result = await fence.runExclusive('suar_test_tasks', () => {
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
        fence.runExclusive('suar_test_projects', () => {
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
