import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  AccomplishmentTransaction,
  AccomplishmentTransactionRunner,
} from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'

export function toLucidAccomplishmentTransaction(
  transaction: AccomplishmentTransaction
): TransactionClientContract
export function toLucidAccomplishmentTransaction(
  transaction: AccomplishmentTransaction | undefined
): TransactionClientContract | undefined
export function toLucidAccomplishmentTransaction(
  transaction: AccomplishmentTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidAccomplishmentTransactionRunner implements AccomplishmentTransactionRunner {
  run<T>(work: (transaction: AccomplishmentTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
