import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
export default class SwitchAndRedirectController {
  async switchOrganization(ctx: HttpContext) {
    const { request, response, session } = ctx

    const organizationId = request.input('organization_id') as string
    await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(organizationId)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Đã chuyển đổi tổ chức thành công' })
      return
    }

    session.flash('success', 'Đã chuyển đổi tổ chức thành công')
    response.redirect('/tasks')
  }

  async handle(ctx: HttpContext) {
    const { params, auth, session, response } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string

    await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(organizationId)
    session.put('current_organization_id', organizationId)

    const intendedUrl = session.get('intended_url', '/') as string
    session.forget('intended_url')

    response.redirect(intendedUrl)
  }
}
