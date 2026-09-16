import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  OrganizationMembershipRecord,
  OrganizationMembershipWithUserRecord,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'

export const asLucidTransaction = (
  transaction?: OrganizationTransaction
): TransactionClientContract | undefined => transaction as TransactionClientContract | undefined

export const toDate = (value: { toJSDate(): Date } | Date | string | null | undefined): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    return new Date(value)
  }
  return value?.toJSDate() ?? new Date(0)
}

export const toAggregateCount = (value: unknown): number => {
  if (typeof value !== 'object' || value === null || !('total' in value)) {
    return 0
  }

  return Number(value.total ?? 0)
}

export const toMembershipRecord = (membership: {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: { toJSDate(): Date } | Date | string
  updated_at: { toJSDate(): Date } | Date | string
}): OrganizationMembershipRecord => ({
  organization_id: membership.organization_id,
  user_id: membership.user_id,
  org_role: membership.org_role,
  status: membership.status,
  invited_by: membership.invited_by,
  created_at: toDate(membership.created_at),
  updated_at: toDate(membership.updated_at),
})

export const toMembershipWithUserRecord = (membership: {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: { toJSDate(): Date } | Date | string
  updated_at: { toJSDate(): Date } | Date | string
  user: {
    id: string
    username: string
    email: string | null
    status: string
    system_role: string
    avatar_url: string | null
    created_at: { toJSDate(): Date } | Date | string
  }
}): OrganizationMembershipWithUserRecord => ({
  ...toMembershipRecord(membership),
  user: {
    ...membership.user,
    created_at: toDate(membership.user.created_at),
  },
})
