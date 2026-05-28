import { test } from '@japa/runner'

import {
  isActiveAuthSessionIdentity,
  resolveSessionOrganizationBinding,
} from '#modules/auth/domain/session-management/session_access_policy'
import {
  isSupportedSocialAuthProvider,
  SUPPORTED_SOCIAL_AUTH_PROVIDERS,
} from '#modules/auth/domain/social-auth/social_auth_provider'
import { normalizeSocialLoginIdentity } from '#modules/auth/domain/social-auth/social_login_identity'

test.group('Auth domain invariants', () => {
  test('owns supported OAuth provider validation', ({ assert }) => {
    assert.deepEqual([...SUPPORTED_SOCIAL_AUTH_PROVIDERS].sort(), ['github', 'google'])
    assert.isTrue(isSupportedSocialAuthProvider('google'))
    assert.isFalse(isSupportedSocialAuthProvider('facebook'))
  })

  test('normalizes social identity before persistence', ({ assert }) => {
    assert.deepEqual(
      normalizeSocialLoginIdentity('github', {
        id: 'github-1',
        email: ' user@example.com ',
        name: 'User',
        nickName: ' preferred-user ',
        token: 'access-token',
        refreshToken: null,
      }),
      {
        ok: true,
        identity: {
          provider: 'github',
          socialId: 'github-1',
          email: 'user@example.com',
          preferredUsername: 'preferred-user',
        },
      }
    )
  })

  test('owns active-session and organization-binding decisions', ({ assert }) => {
    assert.isTrue(isActiveAuthSessionIdentity({ status: 'active', deletedAt: null }))
    assert.isFalse(isActiveAuthSessionIdentity({ status: 'suspended', deletedAt: null }))
    assert.deepEqual(
      resolveSessionOrganizationBinding({
        requestedOrganizationId: 'org-1',
        hasSystemAdministrationAccess: false,
        approvedOrganizationRole: 'org_member',
      }),
      { allowed: true, organizationId: 'org-1' }
    )
    assert.deepEqual(
      resolveSessionOrganizationBinding({
        requestedOrganizationId: 'org-1',
        hasSystemAdministrationAccess: false,
        approvedOrganizationRole: null,
      }),
      { allowed: false, reason: 'organization_membership_required' }
    )
  })
})
