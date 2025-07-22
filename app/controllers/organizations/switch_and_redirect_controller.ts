import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import { PageRoutes } from '#constants/route_constants'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
export default class SwitchAndRedirectController {
  async switchOrganization(ctx: HttpContext) {
    const { request, response, session } = ctx

    const organizationId = request.input('organization_id') as string
    const result = await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(
      organizationId
    )
    session.put('current_organization_id', organizationId)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({
        success: true,
        message: 'Đã chuyển đổi tổ chức thành công',
        redirect: result.redirectPath,
      })
      return
    }

    session.flash('success', 'Đã chuyển đổi tổ chức thành công')
    response.redirect(result.redirectPath || PageRoutes.TASKS)
  }

  async handle(ctx: HttpContext) {
    const { params, auth, session, response } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string

    const result = await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(
      organizationId
    )
    session.put('current_organization_id', organizationId)

    const intendedUrl = session.get('intended_url', result.redirectPath) as string
    session.forget('intended_url')

    response.redirect(intendedUrl)
  }
}
