import type { ComposedUserIdentityReader } from '#composition/adapters/composed_user_identity_reader'
import type { AuthorizationTransaction } from '#modules/authorization/actions/ports/outbound/authorization_transaction'
import { AuthorizationUserIdentityReader } from '#modules/authorization/actions/ports/outbound/authorization_user_identity_reader'

export class AuthorizationUserIdentityReaderAdapter extends AuthorizationUserIdentityReader {
  constructor(
    private readonly users: ComposedUserIdentityReader
  ) {
    super()
  }

  getSystemRoleName(
    userId: string,
    trx?: AuthorizationTransaction
  ): Promise<string | null> {
    return this.users.getSystemRoleName(
      userId,
      trx
    )
  }

  isSystemSuperadmin(
    userId: string,
    trx?: AuthorizationTransaction
  ): Promise<boolean> {
    return this.users.isSystemSuperadmin(
      userId,
      trx
    )
  }
}
