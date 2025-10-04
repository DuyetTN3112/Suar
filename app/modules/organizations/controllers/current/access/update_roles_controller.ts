import type { HttpContext } from '@adonisjs/core/http'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import UpdateCustomRolesCommand from '#modules/organizations/actions/current/access/commands/update_custom_roles_command'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper'
import { getUpdateCustomRolesSuccessMessage } from '#modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper'

export default class UpdateRolesController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    await new UpdateCustomRolesCommand(actionContextFromHttp(ctx)).handle(
      buildUpdateCustomRolesDTO(request)
    )

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.roles.index',
      },
      successMessage: getUpdateCustomRolesSuccessMessage(),
    })
  }
}
