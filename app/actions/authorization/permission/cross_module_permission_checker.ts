import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationPublicApi } from '#actions/organizations/public_api'
import { userPublicApi } from '#actions/users/public_api'
import type { DatabaseId } from '#types/database'

export const crossModulePermissionChecker = {
  async checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const isSuperadmin = await userPublicApi.isSystemSuperadmin(userId, trx)
    if (isSuperadmin) return true
    return organizationPublicApi.checkOrgPermission(userId, organizationId, permission, trx)
  },
}

