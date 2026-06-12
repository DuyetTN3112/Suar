import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import type {
  OrganizationMembershipHistoryFact,
  OrganizationNameFact,
} from '#modules/organizations/public_contracts/members/organization_membership_history'

export const listApprovedMembershipsByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<OrganizationMembershipHistoryFact[]> => {
  return (trx ?? db)
    .from('organization_users as ou')
    .join('organizations as o', 'o.id', 'ou.organization_id')
    .where('ou.user_id', userId)
    .where('ou.status', OrganizationUserStatus.APPROVED)
    .whereNull('o.deleted_at')
    .select(
      'ou.organization_id',
      'o.name as organization_name',
      'ou.org_role',
      'ou.created_at as joined_at',
      'ou.status'
    )
    .orderBy('ou.created_at', 'desc')
}

export const listOrganizationNamesByIds = async (
  organizationIds: string[],
  trx?: TransactionClientContract
): Promise<OrganizationNameFact[]> => {
  if (organizationIds.length === 0) {
    return []
  }

  return (trx ?? db)
    .from('organizations')
    .whereIn('id', organizationIds)
    .whereNull('deleted_at')
    .select('id', 'name')
}
