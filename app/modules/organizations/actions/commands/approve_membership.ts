import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import type { DatabaseId } from '#types/database'

export async function approveMembershipInternal(
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> {
  await membershipMutations.updateStatus(
    organizationId,
    userId,
    OrganizationUserStatus.APPROVED,
    trx
  )
}
