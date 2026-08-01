import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'

export function toLucidReviewTransaction(transaction: ReviewTransaction): TransactionClientContract
export function toLucidReviewTransaction(
  transaction: ReviewTransaction | undefined
): TransactionClientContract | undefined
export function toLucidReviewTransaction(
  transaction: ReviewTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidReviewTransactionRunner implements ReviewTransactionRunner {
  run<T>(work: (transaction: ReviewTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
