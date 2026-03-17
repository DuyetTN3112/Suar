import type { OrganizationTransaction } from './organization_transaction.js'

export interface OrganizationTaskWorkflowInitializer {
  seedDefaultStatusesForOrganization(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<void>
}
