import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'
import { OrganizationRouteAccessReader } from '#modules/organizations/access/actions/ports/inbound/organization_route_access_reader'

interface RequireOrgPermissionOptions {
  permission: string
}

@inject()
export default class RequireOrgPermissionMiddleware {
  constructor(private readonly organizations: OrganizationRouteAccessReader) {}

  async handle(
    { auth, session, response }: HttpContext,
    next: NextFn,
    options: RequireOrgPermissionOptions
  ): Promise<void> {
    const user = auth.user
    if (!user) {
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    const systemAccess = await canAccessSystemAdministration(user.system_role)
    if (systemAccess.allowed) {
      response.redirect('/admin')
      return
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      session.flash('error', 'Please select an organization first')
      response.redirect().toRoute('organizations.index')
      return
    }

    const allowed =
      options.permission.length > 0 &&
      (await this.organizations.checkPermission(user.id, organizationId, options.permission))

    if (!allowed) {
      session.flash('error', 'Access denied. Required organization permission is missing.')
      response.redirect().toPath('/')
      return
    }

    await next()
  }
}
