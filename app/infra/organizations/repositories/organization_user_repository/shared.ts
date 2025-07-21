import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import OrganizationUser from '#models/organization_user'

export interface CountResultRow {
  count?: number | string
}

export interface PaginatedMemberRow {
  user_id: string
  org_role: string
  status: string
  created_at: Date | string
  username: string
  email: string | null
  user_status: string
}

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
}
