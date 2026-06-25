import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { OrganizationRouteAccessReader } from '#modules/organizations/actions/ports/inbound/access/organization_route_access_reader'
import { canAccessOrganizationAdminShell } from '#modules/organizations/public_contracts/access/organization_access'

/**
 * RequireOrgAdminMiddleware
 *
 * Protects routes that require ORGANIZATION-level admin access.
 * Only users with org_role = 'org_owner' or 'org_admin' can proceed.
 *
 * ⚠️ IMPORTANT:
 * - This is for ORGANIZATION admins (manage their org only)
 * - NOT for system admins (manage entire platform)
 * - Organization admin ≠ System admin
 *
 * Prerequisites:
 * - User must be authenticated (middleware.auth())
 * - User must have current_organization_id (middleware.requireOrg())
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // Organization admin routes
 * }).use([middleware.auth(), middleware.requireOrg(), middleware.requireOrgAdmin()])
 * ```
 */
@inject()
export default class RequireOrgAdminMiddleware {
  constructor(private readonly organizations: OrganizationRouteAccessReader) {}

  /**
   * Handle the request
   */
  async handle({ auth, session, response }: HttpContext, next: NextFn): Promise<void> {
    // Check if user is authenticated
    if (!auth.user) {
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    // Check if user has current organization
    const currentOrgId = auth.user.current_organization_id

    if (!currentOrgId) {
      session.flash('error', 'Please select an organization first')
      response.redirect().toRoute('organizations.index')
      return
    }

    const membershipContext = await this.organizations.findApprovedMembership(
      currentOrgId,
      auth.user.id
    )
    const actorOrgRole = membershipContext?.role ?? null

    if (!actorOrgRole) {
      throw new ForbiddenException('You are not a member of this organization')
    }

    if (!canAccessOrganizationAdminShell(actorOrgRole).allowed) {
      throw new ForbiddenException('Organization administrator or owner privileges required')
    }

    await next()
  }
}
