import db from '@adonisjs/lucid/services/db'

import {
  AdminTransactionRunner,
  type AdminTransaction,
} from '#modules/admin/users/actions/ports/outbound/users/admin_transaction_runner'

export class LucidAdminTransactionRunnerAdapter extends AdminTransactionRunner {
  run<T>(
    callback: (transaction: AdminTransaction) => Promise<T>
  ): Promise<T> {
    return db.transaction(callback)
  }
}
