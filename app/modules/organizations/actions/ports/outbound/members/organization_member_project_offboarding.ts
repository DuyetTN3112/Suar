import type { OrganizationTransaction } from '../organization_transaction.js'

export interface OrganizationMemberProjectOffboarding {
  offboardMember(
    organizationId: string,
    userId: string,
    transaction: OrganizationTransaction
  ): Promise<void>
}
