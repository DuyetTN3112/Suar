import db from '@adonisjs/lucid/services/db'

import {
  SprintTransactionRunner,
  type SprintTransaction,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'

export class LucidSprintTransactionRunner extends SprintTransactionRunner {
  run<T>(callback: (trx: SprintTransaction) => Promise<T>): Promise<T> {
    return db.transaction((trx) => callback(trx))
  }
}
