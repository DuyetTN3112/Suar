import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserOAuthProvider from '#infra/users/models/user_oauth_provider'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserOAuthProvider.query({ client: trx }) : UserOAuthProvider.query()
}

export const findByProviderAndProviderId = async (
  provider: string,
  providerId: string,
  trx?: TransactionClientContract
): Promise<UserOAuthProvider | null> => {
  return baseQuery(trx).where('provider', provider).where('provider_id', providerId).first()
}
