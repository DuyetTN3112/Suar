import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { OrganizationRouteAccessReader } from '#modules/organizations/actions/ports/inbound/access/organization_route_access_reader'
import type { OrgRole } from '#modules/organizations/domain/access/org_types'
import { canAccessOrganizationAdminShell } from '#modules/organizations/public_contracts/access/organization_access'

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
@inject()
export default class OrganizationAdminContextMiddleware {
  constructor(private readonly organizations: OrganizationRouteAccessReader) {}

  /**
   * Handle the request
   */
  async handle({ auth, view }: HttpContext, next: NextFn): Promise<void> {
    // Default context
    let isOrgAdmin = false
    let orgRole: OrgRole | null = null
    let contextType: 'organization' | 'user' = 'user'

    // Check if user has current organization
    const { user } = auth
    const currentOrgId = user?.current_organization_id

    if (currentOrgId) {
      const membershipContext = await this.organizations.findApprovedMembership(
        currentOrgId,
        user.id
      )
      orgRole = membershipContext?.role ?? null

      if (orgRole) {
        isOrgAdmin = canAccessOrganizationAdminShell(orgRole).allowed
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
