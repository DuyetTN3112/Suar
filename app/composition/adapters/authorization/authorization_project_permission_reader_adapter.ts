import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { crossModulePermissionChecker } from '#modules/authorization/actions/permission/cross_module_permission_checker'
import type { ProjectPermissionReader } from '#modules/projects/actions/ports/outbound/project_permission_reader'

export class AuthorizationProjectPermissionReaderAdapter implements ProjectPermissionReader {
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
}
