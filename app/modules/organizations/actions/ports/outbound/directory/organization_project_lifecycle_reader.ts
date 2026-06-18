import type { OrganizationTransaction } from '../organization_transaction.js'

export interface OrganizationProjectLifecycleReader {
  countNonDeletedProjects(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<number>

  countRetainedProjects(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<number>
}
