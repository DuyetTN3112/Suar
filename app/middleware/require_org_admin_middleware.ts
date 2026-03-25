import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationUser from '#models/organization_user'

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
export default class RequireOrgAdminMiddleware {
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

    // Get user's role in current organization
    const orgUser = await OrganizationUser.query()
      .where('user_id', auth.user.id)
      .where('organization_id', currentOrgId)
      .where('status', 'approved')
      .first()

    if (!orgUser) {
      session.flash('error', 'You are not a member of this organization')
      response.redirect().toRoute('organizations.index')
      return
    }

    // Check if user is org admin or owner
    const isOrgAdmin = orgUser.org_role === 'org_owner' || orgUser.org_role === 'org_admin'

    if (!isOrgAdmin) {
      session.flash(
        'error',
        'Access denied. Organization administrator or owner privileges required.'
      )
      response.redirect().toRoute('home')
      return
    }

    await next()
  }
}
