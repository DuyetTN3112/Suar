import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserDomainExpertise from '#modules/users/infra/models/user_domain_expertise'

export const create = async (
  data: Partial<UserDomainExpertise>,
  trx?: TransactionClientContract
): Promise<UserDomainExpertise> => {
  return UserDomainExpertise.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  expertise: UserDomainExpertise,
  trx?: TransactionClientContract
): Promise<UserDomainExpertise> => {
  if (trx) {
    expertise.useTransaction(trx)
  }
  await expertise.save()
  return expertise
}
