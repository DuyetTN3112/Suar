import db from '@adonisjs/lucid/services/db'

import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'

export class LucidProjectTransactionRunner implements ProjectTransactionRunner {
  run<T>(work: (transaction: ProjectTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
