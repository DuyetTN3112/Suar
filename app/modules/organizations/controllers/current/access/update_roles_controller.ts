import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateCustomRolesCommand from '#modules/organizations/actions/current/access/commands/update_custom_roles_command'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper'
import {
  getUpdateCustomRolesSuccessMessage,
  mapUpdateCustomRolesSuccessApiBody,
} from '#modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper'

export default class UpdateRolesController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    await new UpdateCustomRolesCommand(actionContextFromHttp(ctx)).handle(
      buildUpdateCustomRolesDTO(request)
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapUpdateCustomRolesSuccessApiBody())
      return
    }

    session.flash('success', getUpdateCustomRolesSuccessMessage())
    response.redirect().toRoute('org.roles.index')
  }
}
