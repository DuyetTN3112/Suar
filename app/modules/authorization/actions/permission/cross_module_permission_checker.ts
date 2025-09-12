import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { userIdentityReader } from '#modules/authorization/infra/adapters/user_identity_reader'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

export const crossModulePermissionChecker = {
  async checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const isSuperadmin = await userIdentityReader.isSystemSuperadmin(userId, trx)
    if (isSuperadmin) return true
    return organizationPublicApi.checkOrgPermission(userId, organizationId, permission, trx)
  },
}
