import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserSkill from '../../../../users/infra/models/user_skill.js'

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
  userId: string,
  trx?: TransactionClientContract
): Promise<UserSkill[]> => {
  const query = trx ? UserSkill.query({ client: trx }) : UserSkill.query()
  return query.where('user_id', userId).preload('skill')
}
