import type { HttpContext } from '@adonisjs/core/http'

import UpdateSubscriptionCommand from '#modules/admin/actions/packages/commands/update_subscription_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


export default class UpdatePackageController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const command = new UpdateSubscriptionCommand(actionContextFromHttp(ctx))

    await command.handle({
      subscriptionId: String(params.id),
      plan: request.input('plan') as string | undefined,
      status: request.input('status') as string | undefined,
      auto_renew: request.input('auto_renew') as boolean | undefined,
      expires_at: (request.input('expires_at') as string | null | undefined) ?? undefined,
    })

    const successMessage = 'Đã cập nhật gói người dùng'
    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: successMessage })
      return
    }

    session.flash('success', successMessage)
    response.redirect().back()
  }
}
