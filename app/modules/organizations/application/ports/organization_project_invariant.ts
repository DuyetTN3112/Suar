import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface OrganizationMemberRemovedProjectInvariantInput {
  organizationId: string
  userId: string
  reason: string | null
  trx?: TransactionClientContract
}

export interface OrganizationProjectInvariant {
  handleMemberRemovedFromOrganization(
    input: OrganizationMemberRemovedProjectInvariantInput
  ): Promise<void>
}
