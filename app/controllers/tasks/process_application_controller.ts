import type { HttpContext } from '@adonisjs/core/http'

import { buildProcessApplicationDTO } from './mappers/request/task_application_request_mapper.js'

import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /applications/:id/process → Approve/reject application
 */
export default class ProcessApplicationController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const dto = await buildProcessApplicationDTO(request, String(params.id))

    const command = new ProcessApplicationCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'approve' ? 'Application approved successfully' : 'Application rejected'
    session.flash('success', message)

    response.redirect().back()
  }
}
