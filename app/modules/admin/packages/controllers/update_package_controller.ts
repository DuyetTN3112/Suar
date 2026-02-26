import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/admin_package_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'

@inject()
export default class UpdatePackageController {
  constructor(private readonly actions: AdminPackageActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const command = this.actions.makeUpdateSubscriptionCommand(actionContextFromHttp(ctx))
    const plan = request.input('plan') as string | undefined
    const status = request.input('status') as string | undefined
    const autoRenew = (request.input('autoRenew') ?? request.input('auto_renew')) as
      | boolean
      | undefined
    const expiresAt = (request.input('expiresAt') ?? request.input('expires_at')) as
      | string
      | null
      | undefined

    await command.handle({
      subscriptionId: String(params['subscriptionId']),
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
      ...(autoRenew === undefined ? {} : { auto_renew: autoRenew }),
      ...(expiresAt === undefined ? {} : { expires_at: expiresAt }),
    })

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã cập nhật gói người dùng',
    })
  }
}
