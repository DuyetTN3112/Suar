import db from '@adonisjs/lucid/services/db'

import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/actions/ports/outbound/organization_transaction'

export class LucidOrganizationTransactionRunner implements OrganizationTransactionRunner {
  run<T>(work: (transaction: OrganizationTransaction) => Promise<T>): Promise<T> {
    return db.transaction(work)
  }
}
