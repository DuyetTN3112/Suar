import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserSkill from '#infra/users/models/user_skill'
import type { DatabaseId } from '#types/database'

export const findByUserAndSkill = async (userId: string, skillId: string) => {
  return await UserSkill.query().where('user_id', userId).where('skill_id', skillId).first()
}

export const getUserSkillsWithDetails = async (userId: string) => {
  return await UserSkill.query()
    .where('user_id', userId)
    .preload('skill')
    .orderBy('created_at', 'desc')
}

export const findUserSkillsWithSkill = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserSkill[]> => {
  const query = trx ? UserSkill.query({ client: trx }) : UserSkill.query()
  return query.where('user_id', userId).preload('skill')
}
