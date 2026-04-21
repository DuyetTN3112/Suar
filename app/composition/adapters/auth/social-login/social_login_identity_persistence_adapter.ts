import type { ComposedUserSocialLoginIdentityPersistence } from '#composition/adapters/auth/social-login/composed_user_social_login_identity_persistence'
import {
  SocialLoginIdentityPersistence,
  type NewSocialLoginIdentity,
  type SocialLoginIdentity,
} from '#modules/auth/actions/ports/outbound/social-auth/social_login_identity_persistence'

export class SocialLoginIdentityPersistenceAdapter extends SocialLoginIdentityPersistence {
  constructor(
    private readonly users: ComposedUserSocialLoginIdentityPersistence
  ) {
    super()
  }

  findById(
    userId: string,
    trx?: Parameters<SocialLoginIdentityPersistence['findById']>[1]
  ): Promise<SocialLoginIdentity | null> {
    return this.users.findById(userId, trx)
  }

  findByEmail(
    email: string,
    trx?: Parameters<SocialLoginIdentityPersistence['findByEmail']>[1]
  ): Promise<SocialLoginIdentity | null> {
    return this.users.findByEmail(email, trx)
  }

  create(
    identity: NewSocialLoginIdentity,
    trx: Parameters<SocialLoginIdentityPersistence['create']>[1]
  ): Promise<SocialLoginIdentity> {
    return this.users.create(identity, trx)
  }

  synchronizeAuthMethod(
    userId: string,
    authMethod: Parameters<SocialLoginIdentityPersistence['synchronizeAuthMethod']>[1],
    trx: Parameters<SocialLoginIdentityPersistence['synchronizeAuthMethod']>[2]
  ): Promise<void> {
    return this.users.synchronizeAuthMethod(
      userId,
      authMethod,
      trx
    )
  }
}
