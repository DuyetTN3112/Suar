import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationAccessActionFactory } from '#modules/organizations/access/actions/ports/inbound/organization_access_action_factory'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/access/controllers/mappers/request/update_roles_request_mapper'
import { getUpdateCustomRolesSuccessMessage } from '#modules/organizations/access/controllers/mappers/response/update_roles_response_mapper'

@inject()
export default class UpdateRolesController {
  constructor(private readonly actions: OrganizationAccessActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    await this.actions.makeUpdateCustomRoles(actionContextFromHttp(ctx)).handle(
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
