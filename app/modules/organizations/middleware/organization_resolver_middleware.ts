import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { HttpStatus, createApiError, ErrorCode, ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { MembershipContext } from '#modules/organizations/domain/org_types'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

interface OrganizationSessionUser {
  id: string
  current_organization_id: string | null
}

/**
 * OrganizationResolver Middleware
 */
export default class OrganizationResolverMiddleware {
  private static readonly EXEMPT_PATH_PREFIXES = [
    '/organizations',
    '/auth',
    '/logout',
    '/errors',
    '/api/organizations',
    '/health',
    '/lang/',
  ] as const

  private isExemptPath(path: string): boolean {
    return OrganizationResolverMiddleware.EXEMPT_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await ctx.auth.check()
    if (!ctx.auth.isAuthenticated || !ctx.auth.user) {
      await next()
      return
    }

    const user = ctx.auth.user
    const sessionOrgId = ctx.session.get('current_organization_id') as string | undefined
    const dbOrgId = user.current_organization_id

    // FAST PATH: No org anywhere → find first membership
    if (!sessionOrgId && !dbOrgId) {
      const membership = await this.findFirstApprovedMembership(user.id)
      if (membership) {
        await this.syncOrganization(ctx, user, membership.organizationId)
      } else {
        this.handleNoOrganization(ctx)
      }
      await next()
      return
    }

    // Determine target org
    const targetOrgId = sessionOrgId ?? dbOrgId
    if (!targetOrgId) {
      await next()
      return
    }

    // Validate membership
    const validMembership = await organizationPublicApi.findApprovedMembership(targetOrgId, user.id)
    if (validMembership) {
      ctx.currentOrganizationId = targetOrgId
      if (sessionOrgId !== dbOrgId || sessionOrgId !== targetOrgId) {
        await this.syncOrganization(ctx, user, targetOrgId)
      }
      if (ctx.session.has('show_organization_required_modal')) {
        ctx.session.forget('show_organization_required_modal')
      }
    } else {
      loggerService.warn('Organization access invalid, clearing', {
        userId: user.id,
        targetOrgId,
      })
      await this.clearOrganization(ctx, user)
      const fallbackMembership = await this.findFirstApprovedMembership(user.id)
      if (fallbackMembership) {
        await this.syncOrganization(ctx, user, fallbackMembership.organizationId)
        ctx.currentOrganizationId = fallbackMembership.organizationId
      } else {
        this.handleNoOrganization(ctx)
      }
    }

    await next()
  }

  private async findFirstApprovedMembership(userId: string): Promise<MembershipContext> {
    return organizationPublicApi.findFirstApprovedMembership(userId)
  }

  private async syncOrganization(
    ctx: HttpContext,
    user: OrganizationSessionUser,
    orgId: string
  ): Promise<void> {
    ctx.session.put('current_organization_id', orgId)
    if (user.current_organization_id !== orgId) {
      try {
        await userPublicApi.updateCurrentOrganization(user.id, orgId)
        user.current_organization_id = orgId
      } catch (error) {
        loggerService.error('Failed to sync organization to DB', {
          userId: user.id,
          orgId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async clearOrganization(ctx: HttpContext, user: OrganizationSessionUser): Promise<void> {
    ctx.session.forget('current_organization_id')
    try {
      await userPublicApi.updateCurrentOrganization(user.id, null)
      user.current_organization_id = null
      ctx.currentOrganizationId = undefined
    } catch (error) {
      loggerService.error('Failed to clear organization from DB', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private handleNoOrganization(ctx: HttpContext): void {
    const currentPath = ctx.request.url(true)
    if (this.isExemptPath(currentPath)) {
      return
    }
    if (ctx.request.accepts(['html', 'json']) === 'json') {
      ctx.response.status(HttpStatus.FORBIDDEN).json({
        ...createApiError(ErrorCode.FORBIDDEN, ErrorMessages.REQUIRE_ORGANIZATION),
        redirectTo: '/organizations',
      })
      return
    }
    ctx.session.put('intended_url', ctx.request.url(true))
    ctx.session.put('show_organization_required_modal', true)
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentOrganizationId?: string
  }
}
