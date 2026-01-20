import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social_auth_provider'

declare const authPersistenceTransaction: unique symbol

export interface AuthPersistenceTransaction {
  readonly [authPersistenceTransaction]: true
}

export interface SocialLoginIdentity {
  id: string
  email: string | null
  system_role: string
  current_organization_id: string | null
  auth_method: SupportedSocialAuthProvider
}

export interface NewSocialLoginIdentity {
  email: string
  username: string
  auth_method: SupportedSocialAuthProvider
}

export abstract class SocialLoginIdentityPersistence {
  abstract findById(
    userId: string,
    trx?: AuthPersistenceTransaction
  ): Promise<SocialLoginIdentity | null>

  abstract findByEmail(
    email: string,
    trx?: AuthPersistenceTransaction
  ): Promise<SocialLoginIdentity | null>

  abstract create(
    identity: NewSocialLoginIdentity,
    trx: AuthPersistenceTransaction
  ): Promise<SocialLoginIdentity>

  abstract synchronizeAuthMethod(
    userId: string,
    authMethod: SupportedSocialAuthProvider,
    trx: AuthPersistenceTransaction
  ): Promise<void>
}
