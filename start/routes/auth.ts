import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import { loginThrottle } from '#start/limiter'

// Auth controllers - Only OAuth and Logout
const LogoutController = () => import('#modules/auth/controllers/logout_controller')
const SocialAuthController = () => import('#modules/auth/controllers/social_auth_controller')

// Social authentication routes (OAuth only)
// FIX BẢO MẬT: Apply loginThrottle — chống brute-force OAuth redirect
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect']).use(loginThrottle)
router.get('/auth/:provider/callback', [SocialAuthController, 'callback']).use(loginThrottle)

// Logout routes
router.post('/logout', [LogoutController, 'handle']).as('logout').use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).as('logout.show').use(middleware.auth())

// Redirect /login to OAuth page (for backward compatibility)
router
  .get('/login', ({ inertia }) => {
    return inertia.render('auth/login', {})
  })
  .as('auth.login')
  .use(loginThrottle)

// Backdoor login route for E2E testing
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  router.post('/api/testing/login', async ({ request, auth, response, session }) => {
    const email = request.input('email') as string | undefined
    const provider = request.input('provider') as string | undefined

    if (!email?.trim()) {
      response.status(422).json({ errors: [{ message: 'Email is required' }] }); return;
    }

    if (!email.includes('@') || email.length > 255) {
      response.status(422).json({ errors: [{ message: 'Email format is invalid' }] }); return;
    }

    if (provider !== undefined && provider !== '') {
      if (provider !== 'google' && provider !== 'github') {
        response.status(422).json({ errors: [{ message: 'Provider must be google or github' }] }); return;
      }
    }

    const userModule = await import('#modules/users/infra/models/user')
    const User = userModule.default

    let user = await User.findBy('email', email)
    const effectiveProvider: 'google' | 'github' = provider === 'github' ? 'github' : 'google'

    if (!user) {
      const { randomUUID } = await import('node:crypto')
      const id = randomUUID()
      user = await User.create({
        id,
        email,
        username: email.split('@')[0],
        status: 'active',
        system_role: email.startsWith('admin') ? 'superadmin' : 'registered_user',
        auth_method: effectiveProvider,
      })

      // Create OAuth provider record so tests can verify OAuth linkage
      const userOAuthProviderModule = await import('#modules/auth/infra/models/user_oauth_provider')
      const UserOAuthProvider = userOAuthProviderModule.default
      await UserOAuthProvider.create({
        id: randomUUID(),
        user_id: id,
        provider: effectiveProvider,
        provider_id: `test-${id}`,
        email,
        access_token: `test-access-token-${id}`,
        refresh_token: `test-refresh-token-${id}`,
      })
    } else {
      // Ensure user has an OAuth provider record for the requested provider
      if (provider) {
        const userOAuthProviderModule = await import('#modules/auth/infra/models/user_oauth_provider')
        const UserOAuthProvider = userOAuthProviderModule.default
        const existingOauth = await UserOAuthProvider.query()
          .where('user_id', user.id)
          .where('provider', effectiveProvider)
          .first()

        if (!existingOauth) {
          const { randomUUID } = await import('node:crypto')
          await UserOAuthProvider.create({
            id: randomUUID(),
            user_id: user.id,
            provider: effectiveProvider,
            provider_id: `test-${user.id}`,
            email,
            access_token: `test-access-token-${user.id}`,
            refresh_token: `test-refresh-token-${user.id}`,
          })
        }
      }
    }

    // Auto-create/assign organization if user is a registered_user and has no valid organization context
    if (user.system_role === 'registered_user') {
      const organizationModule = await import('#modules/organizations/infra/models/organization')
      const Organization = organizationModule.default
      const organizationUserModule = await import('#modules/organizations/infra/models/organization_user')
      const OrganizationUser = organizationUserModule.default
      const { randomUUID } = await import('node:crypto')

      let hasValidOrg = false
      if (user.current_organization_id) {
        const org = await Organization.find(user.current_organization_id)
        if (org) {
          hasValidOrg = true
        }
      }

      if (!hasValidOrg) {
        const existingPivot = await OrganizationUser.query().where('user_id', user.id).first()
        let targetOrgId: string

        const existingOrganization = existingPivot
          ? await Organization.find(existingPivot.organization_id)
          : null

        if (existingPivot && existingOrganization) {
          targetOrgId = existingPivot.organization_id
        } else {
          targetOrgId = randomUUID()
          const slug = `org-${user.username}-${Math.random().toString(36).substring(2, 6)}`

          await Organization.create({
            id: targetOrgId,
            name: `${user.username}'s Workspace`,
            slug,
            owner_id: user.id,
          })

          await OrganizationUser.create({
            organization_id: targetOrgId,
            user_id: user.id,
            org_role: 'org_owner',
            status: OrganizationUserStatus.APPROVED,
          })
        }

        user.current_organization_id = targetOrgId
        await user.save()
      }

      if (user.current_organization_id) {
        session.put("current_organization_id", user.current_organization_id)
      }
    }

    await auth.use('web').login(user, true)
    response.json({ success: true });
  })
}
