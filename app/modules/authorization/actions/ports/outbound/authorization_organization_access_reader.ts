import type { AuthorizationTransaction } from './authorization_transaction.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'


export abstract class AuthorizationOrganizationAccessReader {
  abstract checkPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: AuthorizationTransaction
  ): Promise<boolean>

  abstract getApprovedRole(organizationId: string, userId: string): Promise<string | null>
}

let configuredReader: AuthorizationOrganizationAccessReader | null = null

export function configureAuthorizationOrganizationAccessReader(
  reader: AuthorizationOrganizationAccessReader
): void {
  configuredReader = reader
}

function requireReader(): AuthorizationOrganizationAccessReader {
  if (!configuredReader) {
    throw new InvariantViolationException(
      'Authorization organization access reader has not been configured'
    )
  }
  return configuredReader
}

export const authorizationOrganizationAccessReader: AuthorizationOrganizationAccessReader = {
  checkPermission(userId, organizationId, permission, trx) {
    return requireReader().checkPermission(userId, organizationId, permission, trx)
  },
  getApprovedRole(organizationId, userId) {
    return requireReader().getApprovedRole(organizationId, userId)
  },
}
