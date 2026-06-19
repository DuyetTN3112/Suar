import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondByTransport } from '#modules/http/boundary/http_transport_response'
import { PageRoutes } from '#modules/http/public_contracts/route_constants'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import {
  buildOrganizationSwitchRouteRequest,
} from '#modules/organizations/controllers/mappers/request/access/organization_context_switch_request_mapper'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
@inject()
export default class SwitchAndRedirectController {
  constructor(private readonly actions: OrganizationSwitchCommandFactory) {}

  async switchOrganization(ctx: HttpContext) {
    const { params, response, session } = ctx

    const { organizationId } = buildOrganizationSwitchRouteRequest(params)

    const result = await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(organizationId)
      .then((outcome) => outcome.getValue())
    session.put('current_organization_id', organizationId)
    session.forget('current_project_id')
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
    const { organizationId } = buildOrganizationSwitchRouteRequest(params)

    const result = await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(organizationId)
      .then((outcome) => outcome.getValue())
    session.put('current_organization_id', organizationId)
    session.forget('current_project_id')

    const intendedUrl = session.get('intended_url', result.redirectPath) as string
    session.forget('intended_url')
    await session.commit()

    response.redirect(intendedUrl)
  }
}
