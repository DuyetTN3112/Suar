import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { UserInfraMapper } from '#infra/users/mapper/user_infra_mapper'
import UserSkill from '#infra/users/models/user_skill'
import type { DatabaseId } from '#types/database'
import type { UserSkillRecord } from '#types/user_records'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserSkill.query({ client: trx }) : UserSkill.query()
}

export const toRecord = (userSkill: UserSkill): UserSkillRecord => {
  return UserInfraMapper.toSkillRecord(userSkill)
}

export const findOwnedById = async (
  userSkillId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('id', userSkillId).where('user_id', userId).first()
}

export const findOwnedByIdWithSkill = async (
  userSkillId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('id', userSkillId).where('user_id', userId).preload('skill').first()
}

export const findByUserAndSkill = async (
  userId: DatabaseId,
  skillId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('user_id', userId).where('skill_id', skillId).first()
}

export const listByUserWithSkill = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserSkillRecord[]> => {
  const rows = await baseQuery(trx)
    .where('user_id', userId)
    .preload('skill')
    .orderBy('total_reviews', 'desc')

  return rows.map((row) => toRecord(row))
}
