import type { AuthSessionIdentity } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type {
  IssuedAuthSessionTokenPair,
  StoredAuthSessionTokenPayload,
} from '#modules/auth/actions/ports/outbound/auth_session_token_store'

export type IssuedSessionTokenPair = IssuedAuthSessionTokenPair

export interface VerifiedSessionAccessToken extends StoredAuthSessionTokenPayload {
  user: AuthSessionIdentity
}
