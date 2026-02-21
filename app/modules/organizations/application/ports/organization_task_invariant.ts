import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface OrganizationMemberRemovedTaskInvariantInput {
  organizationId: string
  userId: string
  reason: string | null
  trx?: TransactionClientContract
}

export interface OrganizationTaskInvariant {
  handleMemberRemovedFromOrganization(
    input: OrganizationMemberRemovedTaskInvariantInput
  ): Promise<void>
}
