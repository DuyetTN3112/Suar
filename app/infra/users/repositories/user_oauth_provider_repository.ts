import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserOAuthProvider from '#infra/users/models/user_oauth_provider'

export default class UserOAuthProviderRepository {
  private readonly __instanceMarker = true

  static {
    void new UserOAuthProviderRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserOAuthProvider.query({ client: trx }) : UserOAuthProvider.query()
  }

  static async findByProviderAndProviderId(
    provider: string,
    providerId: string,
    trx?: TransactionClientContract
  ): Promise<UserOAuthProvider | null> {
    return this.baseQuery(trx).where('provider', provider).where('provider_id', providerId).first()
  }

  static async create(
    data: Partial<UserOAuthProvider>,
    trx?: TransactionClientContract
  ): Promise<UserOAuthProvider> {
    return UserOAuthProvider.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    oauthProvider: UserOAuthProvider,
    trx?: TransactionClientContract
  ): Promise<UserOAuthProvider> {
    if (trx) {
      oauthProvider.useTransaction(trx)
    }
    await oauthProvider.save()
    return oauthProvider
  }
}
