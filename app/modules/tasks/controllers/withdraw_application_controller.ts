import type { HttpContext } from '@adonisjs/core/http'

import { buildWithdrawApplicationDTO } from './mappers/request/task_status_request_mapper.js'

import WithdrawApplicationCommand from '#actions/tasks/commands/withdraw_application_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /applications/:id/withdraw → Withdraw my application
 */
export default class WithdrawApplicationController {
  async handle(ctx: HttpContext) {
    const { response, params, session } = ctx

    const dto = buildWithdrawApplicationDTO(String(params.id))
    const command = new WithdrawApplicationCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Application withdrawn successfully')
    response.redirect().back()
  }
}
