import type { ComposedUserIdentityReader } from '#composition/adapters/auth/identity/composed_user_identity_reader'
import {
  AuthSessionIdentityReader,
  type AuthSessionIdentity,
} from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'

export class AuthSessionIdentityReaderAdapter extends AuthSessionIdentityReader {
  constructor(
    private readonly users: ComposedUserIdentityReader
  ) {
    super()
  }

  findById(userId: string): Promise<AuthSessionIdentity | null> {
    return this.users.findSessionIdentity(userId)
  }
}
