import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { baseQuery } from '../read/shared.js'

import OrganizationUser from '#modules/organizations/infra/models/organization_user'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'


export const updateRole = async (
  organizationId: string,
  userId: string,
  orgRole: string,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .update({ org_role: orgRole, updated_at: new Date() })
}

export const deleteMember = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx).where('organization_id', organizationId).where('user_id', userId).delete()
}

export const updateStatus = async (
  organizationId: string,
  userId: string,
  status: 'pending' | 'approved' | 'rejected',
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx)
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .update({ status, updated_at: new Date() })

  if (Array.isArray(result)) {
    if (result.length === 1 && typeof result[0] === 'number') {
      return result[0]
    }
    return result.length
  }
  return Number(result)
}

export const addMember = async (
  data: {
    organization_id: string
    user_id: string
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
