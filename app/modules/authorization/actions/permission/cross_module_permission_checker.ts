import type { AuthorizationTransaction } from '../ports/outbound/authorization_transaction.js'

import { authorizationOrganizationAccessReader } from '#modules/authorization/actions/ports/outbound/authorization_organization_access_reader'


export const crossModulePermissionChecker = {
  async checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: AuthorizationTransaction
  ): Promise<boolean> {
    return authorizationOrganizationAccessReader.checkPermission(
      userId,
      organizationId,
      permission,
      trx
    )
  },
}
