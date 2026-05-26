import type { SocialLoginIdentity } from '#modules/auth/actions/ports/outbound/social-auth/social_login_identity_persistence'
import type { SocialLoginIdentity as NormalizedSocialLoginIdentity } from '#modules/auth/domain/social-auth/social_login_identity'

export abstract class SocialLoginPersistence {
  abstract findLinkedUser(
    identity: NormalizedSocialLoginIdentity
  ): Promise<SocialLoginIdentity | null>

  abstract linkExistingUserByEmail(
    identity: NormalizedSocialLoginIdentity
  ): Promise<SocialLoginIdentity | null>

  abstract registerNewUser(
    identity: NormalizedSocialLoginIdentity
  ): Promise<SocialLoginIdentity>
}
