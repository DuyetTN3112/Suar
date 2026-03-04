import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'

export function toLucidUserTransaction(
  transaction: UserTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidUserTransactionRunner implements UserTransactionRunner {
  run<T>(callback: (transaction: UserTransaction) => Promise<T>): Promise<T> {
    return db.transaction(callback)
  }
}
