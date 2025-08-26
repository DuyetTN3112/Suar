import type { HttpContext } from '@adonisjs/core/http'

import { buildProcessApplicationDTO } from './mappers/request/task_application_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeProcessApplicationCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * POST /applications/:id/process → Approve/reject application
 */
export default class ProcessApplicationController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const dto = await buildProcessApplicationDTO(request, String(params.id))

    const command = makeProcessApplicationCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'approve' ? 'Application approved successfully' : 'Application rejected'
    session.flash('success', message)

    response.redirect().back()
  }
}
