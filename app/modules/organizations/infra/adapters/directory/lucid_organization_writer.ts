import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as organizationMutations from '../../repositories/write/directory/organization_mutations.js'

import { asLucidTransaction } from './persistence_helpers.js'

import type {
  OrganizationRecord,
  OrganizationWriter,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'

export class LucidOrganizationWriter implements OrganizationWriter {
  create(
    data: Record<string, unknown>,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.createRecord(data, asLucidTransaction(transaction))
  }

  findActiveForUpdate(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.findActiveForUpdateRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  update(
    organizationId: string,
    data: Record<string, unknown>,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.updateByIdRecord(
      organizationId,
      data,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  updateOwner(
    organizationId: string,
    ownerId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.updateOwnerRecord(
      organizationId,
      ownerId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  softDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.softDeleteByIdRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  hardDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.hardDeleteByIdRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }
}
