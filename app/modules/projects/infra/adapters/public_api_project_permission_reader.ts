import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { crossModulePermissionChecker } from '#modules/authorization/public_contracts/permission_checker'
import type { ProjectPermissionReader } from '#modules/projects/application/ports/project_permission_reader'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export class PublicApiProjectPermissionReader implements ProjectPermissionReader {
  async checkOrganizationPermission(params: {
    actorUserId: string
    organizationId: string
    permission: string
    trx?: TransactionClientContract
  }): Promise<boolean> {
    return crossModulePermissionChecker.checkOrgPermission(
      params.actorUserId,
      params.organizationId,
      params.permission,
      params.trx
    )
  }

  async isSystemSuperadmin(
    actorUserId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return userPublicApi.isSystemSuperadmin(actorUserId, trx)
  }
}
