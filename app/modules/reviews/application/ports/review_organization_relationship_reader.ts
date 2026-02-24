import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ReviewOrganizationRelationshipReader {
  listActiveOrganizationIdsForUser(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string[]>

  hasAnyActivePartnerOrganization(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<boolean>
}
