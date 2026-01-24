import db from '@adonisjs/lucid/services/db'

import {
  DomainEventOutboxAdministrationTransactionExecutor,
  type DomainEventOutboxAdministrationTransaction,
} from '#modules/events/actions/ports/outbound/domain_event_outbox_administration_ports'

export class LucidDomainEventOutboxAdministrationTransactionExecutor
  extends DomainEventOutboxAdministrationTransactionExecutor
{
  run<T>(
    callback: (trx: DomainEventOutboxAdministrationTransaction) => Promise<T>
  ): Promise<T> {
    return db.transaction((trx) => callback(trx))
  }
}
