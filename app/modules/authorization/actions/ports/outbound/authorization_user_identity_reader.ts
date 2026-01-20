import type { AuthorizationTransaction } from './authorization_transaction.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'


export abstract class AuthorizationUserIdentityReader {
  abstract getSystemRoleName(
    userId: string,
    trx?: AuthorizationTransaction
  ): Promise<string | null>

  abstract isSystemSuperadmin(
    userId: string,
    trx?: AuthorizationTransaction
  ): Promise<boolean>
}

let configuredReader: AuthorizationUserIdentityReader | null = null

export function configureAuthorizationUserIdentityReader(
  reader: AuthorizationUserIdentityReader
): void {
  configuredReader = reader
}

function requireReader(): AuthorizationUserIdentityReader {
  if (!configuredReader) {
    throw new InvariantViolationException(
      'Authorization user identity reader has not been configured'
    )
  }
  return configuredReader
}

export const authorizationUserIdentityReader: AuthorizationUserIdentityReader = {
  getSystemRoleName(userId, trx) {
    return requireReader().getSystemRoleName(userId, trx)
  },
  isSystemSuperadmin(userId, trx) {
    return requireReader().isSystemSuperadmin(userId, trx)
  },
}
