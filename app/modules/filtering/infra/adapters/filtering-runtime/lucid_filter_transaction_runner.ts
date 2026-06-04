import db from '@adonisjs/lucid/services/db'

import type {
  FilterTransaction,
  FilterTransactionRunner,
} from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'

export class LucidFilterTransactionRunner implements FilterTransactionRunner {
  run<T>(work: (transaction: FilterTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
