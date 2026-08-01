import db from '@adonisjs/lucid/services/db'

import type {
  NotificationTransaction,
  NotificationTransactionRunner,
} from '#modules/notifications/actions/ports/outbound/notification_acceptance_repository'

export class LucidNotificationTransactionRunner implements NotificationTransactionRunner {
  run<T>(work: (transaction: NotificationTransaction) => Promise<T>): Promise<T> {
    return db.transaction((transaction) => work(transaction))
  }
}
