import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import {
  HttpStatus,
  ErrorCode,
  ErrorMessages,
} from '#modules/errors/public_contracts/error_constants'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport, isApiTransport } from '#modules/http/boundary/http_transport'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { OrganizationRouteAccessReader } from '#modules/organizations/access/actions/ports/inbound/organization_route_access_reader'
import { OrganizationUserReaderWriter } from '#modules/organizations/access/actions/ports/outbound/organization_external_dependencies'
import { readHttpOrgContextContract } from '#modules/organizations/access/boundary/http_org_context_contract'
import type { MembershipContext } from '#modules/organizations/access/domain/org_types'

interface OrganizationSessionUser {
  id: string
  status?: string
  deleted_at?: unknown
  current_organization_id: string | null
}

/**
 * OrganizationResolver Middleware
 */
@inject()
export default class OrganizationResolverMiddleware {
  constructor(
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationRouteAccessReader
  ) {}

  private static readonly EXEMPT_PATH_PREFIXES = [
    '/admin',
    '/api/admin',
    '/organizations',
    '/auth',
    '/logout',
    '/errors',
    '/notifications',
    '/health',
    '/lang/',
  ] as const

  private isExemptPath(path: string): boolean {
    return OrganizationResolverMiddleware.EXEMPT_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  }

  private isLogoutPath(path: string): boolean {
    return path === '/logout'
  }

  private isInactiveUser(user: OrganizationSessionUser): boolean {
    return user.status === 'suspended' || user.deleted_at !== null
  }

  private rejectInactiveSession(ctx: HttpContext): void {
    ctx.session.forget('auth_web')
    ctx.session.forget('current_organization_id')
    delete ctx.currentOrganizationId
    delete ctx.currentOrganizationRole

    const transport = classifyHttpTransport(ctx)
    if (isApiTransport(transport)) {
      emitApiError(ctx, {
        transport,
        status: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.UNAUTHORIZED,
        detail: 'User is no longer active',
        redirectTo: '/login',
        includeLegacyMeta: true,
      })
      return
    }

    ctx.session.put('intended_url', ctx.request.url())
    ctx.response.redirect().toPath('/login')
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await ctx.auth.check()
    if (!ctx.auth.isAuthenticated || !ctx.auth.user) {
      await next()
      return
    }

    const user = ctx.auth.user
    if (this.isInactiveUser(user) && !this.isLogoutPath(ctx.request.url())) {
      this.rejectInactiveSession(ctx)
      return
    }

    const sessionOrgId = ctx.session.get('current_organization_id') as string | undefined
    const dbOrgId = user.current_organization_id

    // FAST PATH: No org anywhere → find first membership
    if (!sessionOrgId && !dbOrgId) {
      const membership = await this.findFirstApprovedMembership(user.id)
      if (membership) {
        await this.syncOrganization(ctx, user, membership.organizationId)
        ctx.currentOrganizationRole = membership.role
      } else if (this.handleNoOrganization(ctx)) {
        return
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
    const validMembership = await this.organizations.findApprovedMembership(targetOrgId, user.id)
    if (validMembership) {
      ctx.currentOrganizationId = targetOrgId
      ctx.currentOrganizationRole = validMembership.role
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
        ctx.currentOrganizationRole = fallbackMembership.role
      } else if (this.handleNoOrganization(ctx)) {
        return
      }
    }

    await next()
  }

  private async findFirstApprovedMembership(userId: string): Promise<MembershipContext> {
    return this.organizations.findFirstApprovedMembership(userId)
  }

  private async syncOrganization(
    ctx: HttpContext,
    user: OrganizationSessionUser,
    orgId: string
  ): Promise<void> {
    ctx.session.put('current_organization_id', orgId)
    if (user.current_organization_id !== orgId) {
      try {
        await this.userReaderWriter.updateCurrentOrganization(user.id, orgId)
        user.current_organization_id = orgId
      } catch (error) {
        loggerService.error('Failed to sync organization to DB', {
          userId: user.id,
          orgId,
          error: serializeObservabilityError(error),
        })
      }
    }
  }

  private async clearOrganization(ctx: HttpContext, user: OrganizationSessionUser): Promise<void> {
    ctx.session.forget('current_organization_id')
    try {
      await this.userReaderWriter.updateCurrentOrganization(user.id, null)
      user.current_organization_id = null
      delete ctx.currentOrganizationId
      delete ctx.currentOrganizationRole
    } catch (error) {
      loggerService.error('Failed to clear organization from DB', {
        error: serializeObservabilityError(error),
      })
    }
  }

  /**
   * Resolve the no-organization boundary.
   *
   * Returns true only when this middleware has completed the HTTP response and
   * downstream execution must stop. Optional/exempt and HTML flows keep their
   * existing pass-through behavior.
   */
  private handleNoOrganization(ctx: HttpContext): boolean {
    const currentPath = ctx.request.url(true)
    const transport = classifyHttpTransport(ctx)
    const orgContextContract = isApiTransport(transport)
      ? readHttpOrgContextContract(ctx)
      : 'required'

    if (orgContextContract === 'optional') {
      return false
    }

    if (this.isExemptPath(currentPath)) {
      return false
    }

    if (isApiTransport(transport)) {
      emitApiError(ctx, {
        transport,
        status: HttpStatus.FORBIDDEN,
        code: ErrorCode.FORBIDDEN,
        detail: ErrorMessages.REQUIRE_ORGANIZATION,
        redirectTo: '/organizations',
        includeLegacyMeta: true,
      })
      return true
    }
    ctx.session.put('intended_url', ctx.request.url(true))
    ctx.session.put('show_organization_required_modal', true)
    return false
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentOrganizationId?: string
    currentOrganizationRole?: string
  }
}
