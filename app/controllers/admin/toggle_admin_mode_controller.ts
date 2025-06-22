import type { HttpContext } from '@adonisjs/core/http'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'

/**
 * Toggle admin mode for system admins.
 *
 * POST /admin/toggle
 */
export default class ToggleAdminModeController {
  async handle({ auth, request, response, session }: HttpContext) {
    const user = auth.user
    if (!user) {
      response.redirect().toPath('/login')
      return
    }

    const isSystemAdmin = user.system_role === 'superadmin' || user.system_role === 'system_admin'
    if (!isSystemAdmin) {
      session.flash('error', 'Chỉ system admin mới được chuyển Admin Mode')
      response.redirect().back()
      return
    }

    const enabledInput: unknown = request.input('enabled')
    const currentValue = Boolean(session.get('is_admin_mode', false))
    const nextValue =
      typeof enabledInput === 'boolean'
        ? enabledInput
        : typeof enabledInput === 'string'
          ? enabledInput === 'true'
          : !currentValue

    session.put('is_admin_mode', nextValue)

    if (nextValue) {
      session.flash('success', 'Đã bật Admin Mode')
      response.redirect('/admin')
      return
    }

    session.flash('success', 'Đã tắt Admin Mode')

    const currentOrganizationId = user.current_organization_id
    if (!currentOrganizationId) {
      response.redirect('/organizations')
      return
    }

    const membership = await OrganizationUser.query()
      .where('user_id', user.id)
      .where('organization_id', currentOrganizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .first()

    const isOrgAdmin =
      membership?.org_role === OrganizationRole.OWNER ||
      membership?.org_role === OrganizationRole.ADMIN

    response.redirect(isOrgAdmin ? '/org' : '/tasks')
  }
}
