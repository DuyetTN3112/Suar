import type { HttpContext } from '@adonisjs/core/http'

import UpdateSubscriptionCommand from '#actions/admin/packages/commands/update_subscription_command'
import { ExecutionContext } from '#types/execution_context'

export default class UpdatePackageController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const command = new UpdateSubscriptionCommand(ExecutionContext.fromHttp(ctx))

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
