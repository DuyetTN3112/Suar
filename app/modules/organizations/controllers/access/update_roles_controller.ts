import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationAccessActionFactory } from '#modules/organizations/actions/ports/inbound/access/organization_access_action_factory'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/controllers/mappers/request/access/update_roles_request_mapper'
import { getUpdateCustomRolesSuccessMessage } from '#modules/organizations/controllers/mappers/response/access/update_roles_response_mapper'

@inject()
export default class UpdateRolesController {
  constructor(private readonly actions: OrganizationAccessActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    await this.actions
      .makeUpdateCustomRoles(actionContextFromHttp(ctx))
      .executeAndWrap(buildUpdateCustomRolesDTO(request))
      .then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.roles.index',
      },
      successMessage: getUpdateCustomRolesSuccessMessage(),
    })
  }
}
