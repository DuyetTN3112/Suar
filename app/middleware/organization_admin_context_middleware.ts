import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessOrganizationAdminShell } from '#domain/organizations/org_permission_policy'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'

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
    const { user } = auth
    const currentOrgId = user?.current_organization_id

    if (currentOrgId) {
      orgRole = await OrganizationUserRepository.getMemberRoleName(currentOrgId, user.id)

      if (orgRole) {
        isOrgAdmin = canAccessOrganizationAdminShell(orgRole)
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
