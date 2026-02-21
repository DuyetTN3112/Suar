import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PageRoutes } from '#modules/http/public_contracts/route_constants'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/switch_organization_command'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
export default class SwitchAndRedirectController {
  async switchOrganization(ctx: HttpContext) {
    const { request, response, session } = ctx

    const organizationId = request.input('organization_id') as string
    const result = await new SwitchOrganizationCommand(actionContextFromHttp(ctx)).execute(
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

    const result = await new SwitchOrganizationCommand(actionContextFromHttp(ctx)).execute(
      organizationId
    )
    session.put('current_organization_id', organizationId)

    const intendedUrl = session.get('intended_url', result.redirectPath) as string
    session.forget('intended_url')

    response.redirect(intendedUrl)
  }
}
