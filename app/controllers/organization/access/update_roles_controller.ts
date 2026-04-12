import type { HttpContext } from '@adonisjs/core/http'

import UpdateCustomRolesCommand from '#actions/organization/access/commands/update_custom_roles_command'
import { buildUpdateCustomRolesDTO } from '#controllers/organization/access/mappers/request/update_roles_request_mapper'
import {
  getUpdateCustomRolesSuccessMessage,
  mapUpdateCustomRolesSuccessApiBody,
} from '#controllers/organization/access/mappers/response/update_roles_response_mapper'
import { ExecutionContext } from '#types/execution_context'

export default class UpdateRolesController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    await new UpdateCustomRolesCommand(ExecutionContext.fromHttp(ctx)).handle(
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
