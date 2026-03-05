import type { HttpContext } from '@adonisjs/core/http'
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { sessionTokenService } from '#modules/auth/services/session_token_service'
import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport } from '#modules/http/boundary/http_transport'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import {
  getMainTestingAccountConfig,
  isMainTestingAccountEmail,
  resolveTestingSystemRole,
  shouldMountTestingRoutes,
} from '#modules/testing/domain/test_database_safety'
import { apiThrottle, loginThrottle } from '#start/limiter'

function mapTokenPairApiBody(tokenPair: {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
  organizationId: string | null
  systemRole: string
}) {
  return {
    data: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      refreshExpiresIn: tokenPair.refreshExpiresInSeconds,
      organizationId: tokenPair.organizationId,
      systemRole: tokenPair.systemRole,
    },
  }
}

function readStringInput(ctx: HttpContext, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value: unknown = ctx.request.input(key)
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }

  return undefined
}

function emitRouteApiError(ctx: HttpContext, status: number, code: string, detail: string): void {
  emitApiError(ctx, {
    transport: classifyHttpTransport(ctx),
    status,
    code,
    detail,
    includeLegacyMeta: true,
  })
}

function respondTokenPair(
  ctx: HttpContext,
  tokenPair: {
    accessToken: string
    refreshToken: string
    expiresInSeconds: number
    refreshExpiresInSeconds: number
    organizationId: string | null
    systemRole: string
  }
) {
  ctx.response.json(mapTokenPairApiBody(tokenPair))
}

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

const issueSessionTokenApi = async (ctx: HttpContext) => {
  const { auth, session } = ctx
  const user = auth.user
  if (!user) {
    emitRouteApiError(
      ctx,
      HttpStatus.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    )
    return
  }

  const currentOrganizationId =
    (session.get('current_organization_id') as string | undefined) ?? user.current_organization_id

  const tokenPair = await sessionTokenService.issueForUser(user, currentOrganizationId)

  respondTokenPair(ctx, tokenPair)
}

const refreshSessionTokenApi = async (ctx: HttpContext) => {
  const refreshToken = readStringInput(ctx, ['refreshToken', 'refresh_token'])
  const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])

  if (!refreshToken) {
    emitRouteApiError(
      ctx,
      HttpStatus.UNPROCESSABLE_ENTITY,
      ErrorCode.VALIDATION,
      'Refresh token is required'
    )
    return
  }

  try {
    const tokenPair = await sessionTokenService.refresh(refreshToken, requestedOrganizationId)
    respondTokenPair(ctx, tokenPair)
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status?: number }).status === 'number'
        ? (error as { status: number }).status
        : HttpStatus.UNAUTHORIZED
    const message = error instanceof Error ? error.message : 'Refresh token is invalid or expired'
    emitRouteApiError(ctx, status, ErrorCode.UNAUTHORIZED, message)
  }
}

router
  .post('/api/auth/token', issueSessionTokenApi)
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-only'),
    middleware.auth(),
    apiThrottle,
  ])
router
  .post('/api/auth/refresh', refreshSessionTokenApi)
  .use([middleware.bindHttpTransport('api-compat'), apiThrottle])
router
  .post('/api/v1/auth/token', issueSessionTokenApi)
  .as('api.v1.auth.tokens.store')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('session-only'),
    middleware.auth(),
    apiThrottle,
  ])
router
  .post('/api/v1/auth/refresh', refreshSessionTokenApi)
  .as('api.v1.auth.tokens.refresh.store')
  .use([middleware.bindHttpTransport('api-canonical'), apiThrottle])

// Redirect /login to OAuth page (for backward compatibility)
router
  .get('/login', ({ inertia }) => {
    return inertia.render('auth/login', {})
  })
  .as('auth.login')
  .use(loginThrottle)

// Backdoor login route for E2E testing
if (shouldMountTestingRoutes()) {
  const VALID_TESTING_SYSTEM_ROLES = new Set(['registered_user', 'system_admin', 'superadmin'])

  const ensureTestingUser = async (
    email: string,
    provider?: string,
    requestedSystemRole?: string
  ) => {
    const userModule = await import('#modules/users/infra/models/user')
    const User = userModule.default
    const effectiveProvider: 'google' | 'github' = provider === 'github' ? 'github' : 'google'
    const { setTimeout } = await import('node:timers/promises')
    const systemRole = resolveTestingSystemRole(email, requestedSystemRole)
    let user = await User.findBy('email', email)

    if (!user) {
      const { randomUUID } = await import('node:crypto')
      const id = randomUUID()
      try {
        user = await User.create({
          id,
          email,
          username: email.split('@')[0] ?? email,
          status: 'active',
          system_role: systemRole,
          auth_method: effectiveProvider,
        })
      } catch (error) {
        for (let attempt = 0; attempt < 3 && !user; attempt++) {
          user = await User.findBy('email', email)
          if (!user) {
            await setTimeout(25)
          }
        }

        if (!user) {
          throw error
        }
      }

      const userOAuthProviderModule = await import('#modules/auth/infra/models/user_oauth_provider')
      const UserOAuthProvider = userOAuthProviderModule.default
      try {
        await UserOAuthProvider.create({
          id: randomUUID(),
          user_id: id,
          provider: effectiveProvider,
          provider_id: `test-${id}`,
          email,
          access_token: `test-access-token-${id}`,
          refresh_token: `test-refresh-token-${id}`,
        })
      } catch (error) {
        let existingOauth = null

        for (let attempt = 0; attempt < 3 && !existingOauth; attempt++) {
          existingOauth = await UserOAuthProvider.query()
            .where('user_id', user.id)
            .where('provider', effectiveProvider)
            .first()

          if (!existingOauth) {
            await setTimeout(25)
          }
        }

        if (!existingOauth) {
          throw error
        }
      }
    } else if (user.system_role !== systemRole) {
      await user.merge({ system_role: systemRole }).save()
    } else if (provider) {
      const userOAuthProviderModule = await import('#modules/auth/infra/models/user_oauth_provider')
      const UserOAuthProvider = userOAuthProviderModule.default
      let existingOauth = await UserOAuthProvider.query()
        .where('user_id', user.id)
        .where('provider', effectiveProvider)
        .first()

      if (!existingOauth) {
        const { randomUUID } = await import('node:crypto')
        try {
          await UserOAuthProvider.create({
            id: randomUUID(),
            user_id: user.id,
            provider: effectiveProvider,
            provider_id: `test-${user.id}`,
            email,
            access_token: `test-access-token-${user.id}`,
            refresh_token: `test-refresh-token-${user.id}`,
          })
        } catch (error) {
          for (let attempt = 0; attempt < 3 && !existingOauth; attempt++) {
            existingOauth = await UserOAuthProvider.query()
              .where('user_id', user.id)
              .where('provider', effectiveProvider)
              .first()

            if (!existingOauth) {
              await setTimeout(25)
            }
          }

          if (!existingOauth) {
            throw error
          }
        }
      }
    }

    return user
  }

  const ensureTestingUserOrganization = async (
    user: {
      id: string
      username: string
      email: string | null
      system_role: string
      current_organization_id: string | null
      save: () => Promise<unknown>
    },
    session: { put: (key: string, value: string) => void },
    requestedOrganizationId?: string
  ) => {
    if (user.system_role === 'registered_user') {
      const userModule = await import('#modules/users/infra/models/user')
      const User = userModule.default
      const organizationModule = await import('#modules/organizations/infra/models/organization')
      const Organization = organizationModule.default
      const organizationUserModule =
        await import('#modules/organizations/infra/models/organization_user')
      const OrganizationUser = organizationUserModule.default
      const { randomUUID } = await import('node:crypto')

      const ensureMembership = async (
        organizationId: string,
        userId: string,
        role: 'org_owner' | 'org_admin' | 'org_member',
        invitedBy: string | null = null
      ) => {
        const existing = await OrganizationUser.query()
          .where('organization_id', organizationId)
          .where('user_id', userId)
          .first()

        if (existing) {
          await existing
            .merge({
              org_role: role,
              status: OrganizationUserStatus.APPROVED,
              invited_by: invitedBy,
            })
            .save()
          return
        }

        await OrganizationUser.create({
          organization_id: organizationId,
          user_id: userId,
          org_role: role,
          status: OrganizationUserStatus.APPROVED,
          invited_by: invitedBy,
        })
      }

      const mainTestingConfig = getMainTestingAccountConfig()
      if (mainTestingConfig && isMainTestingAccountEmail(user.email)) {
        let primaryOrg = await Organization.findBy('slug', mainTestingConfig.primaryOrgSlug)
        if (!primaryOrg) {
          primaryOrg = await Organization.create({
            id: randomUUID(),
            name: mainTestingConfig.primaryOrgName,
            slug: mainTestingConfig.primaryOrgSlug,
            description:
              'Canonical organization owned by the main test account for local and E2E testing.',
            owner_id: user.id,
            plan: 'professional',
          })
        } else if (primaryOrg.owner_id !== user.id) {
          await primaryOrg.merge({ owner_id: user.id, plan: 'professional' }).save()
        }

        let secondaryOwner = await User.findBy('email', mainTestingConfig.secondaryOwnerEmail)
        if (!secondaryOwner) {
          secondaryOwner = await User.create({
            id: randomUUID(),
            email: mainTestingConfig.secondaryOwnerEmail,
            username: mainTestingConfig.secondaryOwnerUsername,
            status: 'active',
            system_role: 'registered_user',
            auth_method: 'google',
          })
        }

        let secondaryOrg = await Organization.findBy('slug', mainTestingConfig.secondaryOrgSlug)
        if (!secondaryOrg) {
          secondaryOrg = await Organization.create({
            id: randomUUID(),
            name: mainTestingConfig.secondaryOrgName,
            slug: mainTestingConfig.secondaryOrgSlug,
            description:
              'Canonical secondary organization where the main test account is a member.',
            owner_id: secondaryOwner.id,
            plan: 'starter',
          })
        } else if (secondaryOrg.owner_id !== secondaryOwner.id) {
          await secondaryOrg.merge({ owner_id: secondaryOwner.id, plan: 'starter' }).save()
        }

        await ensureMembership(primaryOrg.id, user.id, 'org_owner')
        await ensureMembership(secondaryOrg.id, secondaryOwner.id, 'org_owner')
        await ensureMembership(secondaryOrg.id, user.id, 'org_member', secondaryOwner.id)

        user.current_organization_id = primaryOrg.id
        await user.save()
      }

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
    }

    if (requestedOrganizationId) {
      const organizationModule = await import('#modules/organizations/infra/models/organization')
      const Organization = organizationModule.default
      const organizationUserModule =
        await import('#modules/organizations/infra/models/organization_user')
      const OrganizationUser = organizationUserModule.default

      const targetOrg = await Organization.find(requestedOrganizationId)
      if (!targetOrg) {
        return {
          ok: false as const,
          status: 404,
          body: { errors: [{ message: 'Organization not found' }] },
        }
      }

      const membership = await OrganizationUser.query()
        .where('organization_id', requestedOrganizationId)
        .where('user_id', user.id)
        .where('status', OrganizationUserStatus.APPROVED)
        .first()

      if (!membership) {
        return {
          ok: false as const,
          status: 403,
          body: {
            errors: [{ message: 'User is not an approved member of the requested organization' }],
          },
        }
      }

      user.current_organization_id = requestedOrganizationId
      await user.save()
    }

    if (user.current_organization_id) {
      session.put('current_organization_id', user.current_organization_id)
    }

    return {
      ok: true as const,
      organizationId: user.current_organization_id,
    }
  }

  router
    .post('/api/testing/login', async (ctx: HttpContext) => {
      const { auth, session } = ctx
      const email = readStringInput(ctx, ['email'])
      const provider = readStringInput(ctx, ['provider'])
      const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])
      const requestedSystemRole = readStringInput(ctx, ['systemRole', 'system_role'])

      if (!email) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Email is required'
        )
        return
      }

      if (!email.includes('@') || email.length > 255) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Email format is invalid'
        )
        return
      }

      if (provider !== undefined) {
        if (provider !== 'google' && provider !== 'github') {
          emitRouteApiError(
            ctx,
            HttpStatus.UNPROCESSABLE_ENTITY,
            ErrorCode.VALIDATION,
            'Provider must be google or github'
          )
          return
        }
      }

      if (requestedOrganizationId !== undefined && requestedOrganizationId.length > 255) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Organization ID is invalid'
        )
        return
      }

      if (
        requestedSystemRole !== undefined &&
        !VALID_TESTING_SYSTEM_ROLES.has(requestedSystemRole)
      ) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'System role is invalid'
        )
        return
      }

      const user = await ensureTestingUser(email, provider, requestedSystemRole)
      const organizationResult = await ensureTestingUserOrganization(
        user,
        session,
        requestedOrganizationId
      )
      if (!organizationResult.ok) {
        const detail = organizationResult.body.errors[0]?.message ?? 'Organization request failed'
        emitRouteApiError(
          ctx,
          organizationResult.status,
          organizationResult.status === HttpStatus.NOT_FOUND
            ? ErrorCode.NOT_FOUND
            : ErrorCode.FORBIDDEN,
          detail
        )
        return
      }

      await auth.use('web').login(user, true)
      ctx.response.noContent()
    })
    .use([middleware.bindHttpTransport('api-ops-internal')])

  router
    .post('/api/testing/token-login', async (ctx: HttpContext) => {
      const { session } = ctx
      const email = readStringInput(ctx, ['email'])
      const provider = readStringInput(ctx, ['provider'])
      const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])
      const requestedSystemRole = readStringInput(ctx, ['systemRole', 'system_role'])

      if (!email) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Email is required'
        )
        return
      }

      if (
        requestedSystemRole !== undefined &&
        !VALID_TESTING_SYSTEM_ROLES.has(requestedSystemRole)
      ) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'System role is invalid'
        )
        return
      }

      const user = await ensureTestingUser(email, provider, requestedSystemRole)
      const organizationResult = await ensureTestingUserOrganization(
        user,
        session,
        requestedOrganizationId
      )
      if (!organizationResult.ok) {
        const detail = organizationResult.body.errors[0]?.message ?? 'Organization request failed'
        emitRouteApiError(
          ctx,
          organizationResult.status,
          organizationResult.status === HttpStatus.NOT_FOUND
            ? ErrorCode.NOT_FOUND
            : ErrorCode.FORBIDDEN,
          detail
        )
        return
      }

      const tokenPair = await sessionTokenService.issueForUser(
        user,
        organizationResult.organizationId
      )

      respondTokenPair(ctx, tokenPair)
    })
    .use([middleware.bindHttpTransport('api-ops-internal')])

  router
    .post('/api/testing/token-refresh', async (ctx: HttpContext) => {
      const refreshToken = readStringInput(ctx, ['refreshToken', 'refresh_token'])
      const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])

      if (!refreshToken) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Refresh token is required'
        )
        return
      }

      try {
        const tokenPair = await sessionTokenService.refresh(refreshToken, requestedOrganizationId)
        respondTokenPair(ctx, tokenPair)
      } catch (error) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: number }).status === 'number'
            ? (error as { status: number }).status
            : HttpStatus.UNAUTHORIZED
        const message =
          error instanceof Error ? error.message : 'Refresh token is invalid or expired'
        emitRouteApiError(ctx, status, ErrorCode.UNAUTHORIZED, message)
      }
    })
    .use([middleware.bindHttpTransport('api-ops-internal')])

  router
    .post('/api/testing/session/bootstrap', async (ctx: HttpContext) => {
      const { request, auth, session } = ctx
      const authorizationHeader = request.header('authorization')
      const accessTokenFromHeader = authorizationHeader?.startsWith('Bearer ')
        ? authorizationHeader.slice('Bearer '.length).trim()
        : null
      const accessToken =
        accessTokenFromHeader ?? readStringInput(ctx, ['accessToken', 'access_token'])

      if (!accessToken) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION,
          'Access token is required'
        )
        return
      }

      const verified = await sessionTokenService.verifyAccessToken(accessToken)
      if (!verified) {
        emitRouteApiError(
          ctx,
          HttpStatus.UNAUTHORIZED,
          ErrorCode.UNAUTHORIZED,
          'Access token is invalid or expired'
        )
        return
      }

      if (verified.organizationId) {
        verified.user.current_organization_id = verified.organizationId
        await verified.user.save()
        session.put('current_organization_id', verified.organizationId)
      } else {
        session.forget('current_organization_id')
      }

      await auth.use('web').login(verified.user, true)

      ctx.response.json(
        wrapApiV1Data({
          organizationId: verified.organizationId,
          systemRole: verified.systemRole,
          email: verified.email,
        })
      )
    })
    .use([middleware.bindHttpTransport('api-ops-internal')])
}
