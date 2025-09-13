import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { findNotDeletedOrFail } from '../read/model_queries.js'

import { UserInfraMapper } from '#modules/users/infra/mapper/user_infra_mapper'
import User from '#modules/users/infra/models/user'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'

export const create = async (
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<User> => {
  return User.create(data, trx ? { client: trx } : undefined)
}

export const createRecord = async (
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  const user = await create(data, trx)
  return UserInfraMapper.toRecord(user)
}

export const save = async (user: User, trx?: TransactionClientContract): Promise<User> => {
  if (trx) {
    user.useTransaction(trx)
  }
  await user.save()
  return user
}

export const updateCurrentOrganization = async (
  userId: string,
  organizationId: string | null,
  trx?: TransactionClientContract
): Promise<void> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  await query.where('id', userId).update({ current_organization_id: organizationId })
}

export const updateByIdRecord = async (
  userId: string,
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  const user = await findNotDeletedOrFail(userId, trx)
  user.merge(data)
  await save(user, trx)
  return UserInfraMapper.toRecord(user)
}

export const updateStatusRecord = async (
  userId: string,
  status: string,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  return updateByIdRecord(userId, { status }, trx)
}

export const updateSystemRoleRecord = async (
  userId: string,
  systemRole: string,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  return updateByIdRecord(userId, { system_role: systemRole }, trx)
}

export const mergeTrustData = async (
  userId: string,
  trustData: Partial<UserTrustData>,
  trx?: TransactionClientContract
): Promise<void> => {
  const user = await findNotDeletedOrFail(userId, trx)
  user.trust_data = {
    ...(user.trust_data ?? {
      current_tier_code: null,
      calculated_score: 0,
      raw_score: 0,
      total_verified_reviews: 0,
      last_calculated_at: null,
    }),
    ...trustData,
  }
  await save(user, trx)
}

export const updateCredibilityData = async (
  userId: string,
  credibilityData: UserCredibilityData,
  trx?: TransactionClientContract
): Promise<void> => {
  const user = await findNotDeletedOrFail(userId, trx)
  user.credibility_data = credibilityData
  await save(user, trx)
}

export const softDelete = async (user: User, trx?: TransactionClientContract): Promise<User> => {
  user.deleted_at = DateTime.now()
  return save(user, trx)
}
