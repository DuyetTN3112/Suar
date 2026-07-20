import db from '@adonisjs/lucid/services/db'

import type { SearchIndexCutoverFencePort } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'

const SEARCH_INDEX_CUTOVER_FENCE_NAMESPACE = 'suar.search.index_cutover.v1'
const SEARCH_INDEX_CUTOVER_LOCK_TIMEOUT = '5000ms'

interface SearchIndexCutoverTransaction {
  rawQuery(sql: string, bindings: string[]): Promise<void>
}

export interface SearchIndexCutoverTransactionGateway {
  transaction<T>(callback: (transaction: SearchIndexCutoverTransaction) => Promise<T>): Promise<T>
}

const defaultTransactionGateway: SearchIndexCutoverTransactionGateway = {
  transaction: <T>(
    callback: (transaction: SearchIndexCutoverTransaction) => Promise<T>
  ): Promise<T> =>
    db.transaction(async (trx) =>
      callback({
        rawQuery: async (sql, bindings) => {
          await trx.rawQuery(sql, bindings)
        },
      })
    ),
}

/**
 * Serializes an Elasticsearch alias cutover for the lifetime of one short
 * PostgreSQL transaction. PostgreSQL releases the transaction-scoped advisory
 * lock automatically on commit, rollback, or connection loss.
 */
export class PostgresSearchIndexCutoverFence implements SearchIndexCutoverFencePort {
  constructor(
    private readonly transactionGateway: SearchIndexCutoverTransactionGateway = defaultTransactionGateway
  ) {}

  async runExclusive<T>(aliasName: string, callback: () => Promise<T>): Promise<T> {
    if (aliasName.length === 0) {
      throw new TypeError('Search index cutover fence requires an alias name')
    }

    return this.transactionGateway.transaction(async (transaction) => {
      await transaction.rawQuery("SELECT set_config('lock_timeout', ?, true)", [
        SEARCH_INDEX_CUTOVER_LOCK_TIMEOUT,
      ])
      await transaction.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))', [
        SEARCH_INDEX_CUTOVER_FENCE_NAMESPACE,
        aliasName,
      ])
      return callback()
    })
  }
}
