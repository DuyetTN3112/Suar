import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserSkill from '#infra/users/models/user_skill'

export const create = async (
  data: Partial<UserSkill>,
  trx?: TransactionClientContract
): Promise<UserSkill> => {
  return UserSkill.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  userSkill: UserSkill,
  trx?: TransactionClientContract
): Promise<UserSkill> => {
  if (trx) {
    userSkill.useTransaction(trx)
  }
  await userSkill.save()
  return userSkill
}

export const deleteUserSkill = async (
  userSkill: UserSkill,
  trx?: TransactionClientContract
): Promise<void> => {
  if (trx) {
    userSkill.useTransaction(trx)
  }
  await userSkill.delete()
}

export { deleteUserSkill as delete }
