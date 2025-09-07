import type { HttpContext } from '@adonisjs/core/http'

import { buildWithdrawApplicationDTO } from './mappers/request/task_status_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeWithdrawApplicationCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * POST /applications/:id/withdraw → Withdraw my application
 */
export default class WithdrawApplicationController {
  async handle(ctx: HttpContext) {
    const { response, params, session } = ctx

    const dto = buildWithdrawApplicationDTO(String(params.id))
    const command = makeWithdrawApplicationCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Application withdrawn successfully')
    response.redirect().back()
  }
}
