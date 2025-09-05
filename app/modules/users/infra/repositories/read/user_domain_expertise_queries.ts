import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserDomainExpertise from '#modules/users/infra/models/user_domain_expertise'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserDomainExpertise.query({ client: trx }) : UserDomainExpertise.query()
}

export const findByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserDomainExpertise | null> => {
  return baseQuery(trx).where('user_id', userId).first()
}
