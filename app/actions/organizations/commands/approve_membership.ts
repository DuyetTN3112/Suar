import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import type { DatabaseId } from '#types/database'

export async function approveMembershipInternal(
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> {
  await OrganizationUserRepository.updateStatus(
    organizationId,
    userId,
    OrganizationUserStatus.APPROVED,
    trx
  )
}
