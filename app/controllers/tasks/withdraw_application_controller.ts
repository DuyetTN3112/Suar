import type { HttpContext } from '@adonisjs/core/http'
import WithdrawApplicationCommand from '#actions/tasks/commands/withdraw_application_command'
import { WithdrawApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'

/**
 * POST /applications/:id/withdraw → Withdraw my application
 */
export default class WithdrawApplicationController {
  async handle(ctx: HttpContext) {
    const { response, params, session } = ctx

    const dto = new WithdrawApplicationDTO(String(params.id))
    const command = new WithdrawApplicationCommand(ctx)
    await command.handle(dto)

    session.flash('success', 'Application withdrawn successfully')
    response.redirect().back()
  }
}
