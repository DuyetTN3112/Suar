import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/packages/admin_package_action_factory'
import { buildUpdatePackageRequest } from '#modules/admin/packages/controllers/mappers/request/packages/update_package_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'

@inject()
export default class UpdatePackageController {
  constructor(private readonly actions: AdminPackageActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const command = this.actions.makeUpdateSubscriptionCommand(actionContextFromHttp(ctx))
    await command
      .executeAndWrap(buildUpdatePackageRequest({ params, body: request.all() }))
      .then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã cập nhật gói người dùng',
    })
  }
}
