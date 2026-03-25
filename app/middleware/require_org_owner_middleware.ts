import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationUser from '#models/organization_user'

/**
 * RequireOrgOwnerMiddleware
 *
 * Protects routes that require ORGANIZATION OWNER access only.
 * More restrictive than RequireOrgAdminMiddleware.
 *
 * Use cases:
 * - Billing and subscription management
 * - Transfer ownership
 * - Delete organization
 * - Critical settings
 *
 * Prerequisites:
 * - User must be authenticated (middleware.auth())
 * - User must have current_organization_id (middleware.requireOrg())
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // Organization owner routes (e.g., billing)
 * }).use([middleware.auth(), middleware.requireOrg(), middleware.requireOrgOwner()])
 * ```
 */
export default class RequireOrgOwnerMiddleware {
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

    // Check if user is org owner (strict check)
    const isOrgOwner = orgUser.org_role === 'org_owner'

    if (!isOrgOwner) {
      session.flash('error', 'Access denied. Organization owner privileges required.')
      response.redirect().toRoute('org.dashboard')
      return
    }

    await next()
  }
}
