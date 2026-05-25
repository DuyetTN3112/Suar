import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { userPublicApi } from '#modules/users/actions/public_api'

export const userIdentityReader = {
  async getSystemRoleName(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userPublicApi.getSystemRoleName(userId, trx)
  },

  async isSystemSuperadmin(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return userPublicApi.isSystemSuperadmin(userId, trx)
  },
}
