import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserOAuthProvider from '#infra/users/models/user_oauth_provider'

export const create = async (
  data: Partial<UserOAuthProvider>,
  trx?: TransactionClientContract
): Promise<UserOAuthProvider> => {
  return UserOAuthProvider.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  oauthProvider: UserOAuthProvider,
  trx?: TransactionClientContract
): Promise<UserOAuthProvider> => {
  if (trx) {
    oauthProvider.useTransaction(trx)
  }
  await oauthProvider.save()
  return oauthProvider
}
