import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { UserInfraMapper } from '#modules/users/infra/mapper/user_infra_mapper'
import UserSkill from '#modules/users/infra/models/user_skill'
import type { UserSkillRecord } from '#modules/users/types/user_records'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserSkill.query({ client: trx }) : UserSkill.query()
}

export const toRecord = (userSkill: UserSkill): UserSkillRecord => {
  return UserInfraMapper.toSkillRecord(userSkill)
}

export const findOwnedById = async (
  userSkillId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('id', userSkillId).where('user_id', userId).first()
}

export const findOwnedByIdWithSkill = async (
  userSkillId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('id', userSkillId).where('user_id', userId).preload('skill').first()
}

export const findByUserAndSkill = async (
  userId: string,
  skillId: string,
  trx?: TransactionClientContract
): Promise<UserSkill | null> => {
  return baseQuery(trx).where('user_id', userId).where('skill_id', skillId).first()
}

export const listByUserWithSkill = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserSkillRecord[]> => {
  const rows = await baseQuery(trx)
    .where('user_id', userId)
    .preload('skill')
    .orderBy('total_reviews', 'desc')

  return rows.map((row) => toRecord(row))
}
