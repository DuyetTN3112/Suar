import type { HttpContext } from '@adonisjs/core/http'

import UpdateSubscriptionCommand from '#modules/admin/actions/packages/commands/update_subscription_command'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

export default class UpdatePackageController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const command = new UpdateSubscriptionCommand(actionContextFromHttp(ctx))
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
