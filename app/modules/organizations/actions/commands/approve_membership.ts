import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

export async function approveMembershipInternal(
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<void> {
  await membershipMutations.updateStatus(
    organizationId,
    userId,
    OrganizationUserStatus.APPROVED,
    trx
  )
}
