import db from '@adonisjs/lucid/services/db'

import type {
  TaskTransaction,
  TaskTransactionRunner,
} from '#modules/tasks/actions/ports/outbound/task_transaction'

export class LucidTaskTransactionRunner implements TaskTransactionRunner {
  run<T>(work: (transaction: TaskTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
