import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserDomainExpertise from '#infra/users/models/user_domain_expertise'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserDomainExpertise.query({ client: trx }) : UserDomainExpertise.query()
}

export const findByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserDomainExpertise | null> => {
  return baseQuery(trx).where('user_id', userId).first()
}
