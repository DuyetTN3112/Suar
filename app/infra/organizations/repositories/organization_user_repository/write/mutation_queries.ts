import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from '../read/shared.js'

import { OrganizationUserStatus } from '#constants/organization_constants'
import OrganizationUser from '#infra/organizations/models/organization_user'
import type { DatabaseId } from '#types/database'


export const updateRole = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  orgRole: string,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .update({ org_role: orgRole, updated_at: new Date() })
}

export const deleteMember = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx).where('organization_id', organizationId).where('user_id', userId).delete()
}

export const updateStatus = async (
  organizationId: DatabaseId,
  userId: DatabaseId,
  status: 'pending' | 'approved' | 'rejected',
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .update({ status, updated_at: new Date() })

  return Array.isArray(result) ? result.length : Number(result)
}

export const addMember = async (
  data: {
    organization_id: DatabaseId
    user_id: DatabaseId
    org_role: string
    status?: OrganizationUserStatus
  },
  trx?: TransactionClientContract
): Promise<OrganizationUser> => {
  return OrganizationUser.create(
    {
      organization_id: data.organization_id,
      user_id: data.user_id,
      org_role: data.org_role,
      status: data.status ?? OrganizationUserStatus.APPROVED,
    },
    trx ? { client: trx } : undefined
  )
}
