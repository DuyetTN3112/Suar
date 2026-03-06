import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface OrganizationTaskWorkflowInitializer {
  seedDefaultStatusesForOrganization(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<void>
}
