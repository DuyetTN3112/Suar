import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { OrganizationRole } from '#constants/organization_constants'
import OrganizationUser from '#models/organization_user'

/**
 * OrganizationAdminContextMiddleware
 *
 * Sets context variables for organization admin interface.
 * Detects user's role in current organization and determines UI context.
 *
 * Context variables shared:
 * - isOrgAdmin: boolean - Is user org owner or org admin?
 * - orgRole: string | null - User's role in current org
 * - contextType: 'organization' | 'user' - Which UI to show
 *
 * Logic:
 * - IF org_role IN ('org_owner', 'org_admin') → Organization Layout
 * - ELSE → User Layout
 *
 * Prerequisites:
 * - User must be authenticated (middleware.auth())
 * - User should have current_organization_id (optional, gracefully handles null)
 *
 * Usage:
 * ```typescript
 * // Apply globally or per-route group
 * router.use([middleware.auth(), middleware.orgAdminContext()])
 * ```
 */
export default class OrganizationAdminContextMiddleware {
  /**
   * Handle the request
   */
  async handle({ auth, view }: HttpContext, next: NextFn): Promise<void> {
    // Default context
    let isOrgAdmin = false
    let orgRole: string | null = null
    let contextType: 'organization' | 'user' = 'user'

    // Check if user has current organization
    const currentOrgId = auth.user?.current_organization_id

    if (currentOrgId && auth.user) {
      // Get user's role in current organization
      const orgUser = await OrganizationUser.query()
        .where('user_id', auth.user.id)
        .where('organization_id', currentOrgId)
        .where('status', 'approved')
        .first()

      if (orgUser) {
        orgRole = orgUser.org_role

        // Check if user is org admin or owner
        isOrgAdmin =
          orgRole === OrganizationRole.OWNER || orgRole === OrganizationRole.ADMIN

        // Determine context type
        contextType = isOrgAdmin ? 'organization' : 'user'
      }
    }

    // Share context to views
    view.share({
      isOrgAdmin,
      orgRole,
      contextType,
    })

    await next()
  }
}
