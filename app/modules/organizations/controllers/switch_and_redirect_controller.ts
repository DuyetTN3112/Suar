import type { HttpContext } from '@adonisjs/core/http'

import { respondByTransport } from '#modules/http/boundary/http_transport_response'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { PageRoutes } from '#modules/http/public_contracts/route_constants'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/switch_organization_command'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
export default class SwitchAndRedirectController {
  async switchOrganization(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const organizationId =
      (request.input('organizationId') as string | undefined) ??
      (request.input('organization_id') as string | undefined) ??
      (params['organizationId'] as string | undefined)

    if (!organizationId) {
      throw new ValidationException('Organization ID is required')
    }

    const result = await new SwitchOrganizationCommand(actionContextFromHttp(ctx)).execute(
      organizationId
    )
    session.put('current_organization_id', organizationId)
    await session.commit()

    return respondByTransport(ctx, {
      api: () => {
        return {
          data: {
            message: 'Đã chuyển đổi tổ chức thành công',
            redirect: result.redirectPath,
            organization: result.organization,
          },
        }
      },
      page: () => {
        session.flash('success', 'Đã chuyển đổi tổ chức thành công')
        return response.redirect(result.redirectPath || PageRoutes.TASKS)
      },
    })
  }

  async handle(ctx: HttpContext) {
    const { params, auth, session, response } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const organizationId = params['organizationId'] as string

    const result = await new SwitchOrganizationCommand(actionContextFromHttp(ctx)).execute(
      organizationId
    )
    session.put('current_organization_id', organizationId)

    const intendedUrl = session.get('intended_url', result.redirectPath) as string
    session.forget('intended_url')
    await session.commit()

    response.redirect(intendedUrl)
  }
}
