import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import { ProcessApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /applications/:id/process → Approve/reject application
 */
export default class ProcessApplicationController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const assignmentTypeRaw = String(request.input('assignment_type', 'freelancer'))
    if (!['member', 'freelancer', 'volunteer'].includes(assignmentTypeRaw)) {
      throw new BusinessLogicException(`Invalid assignment type: ${assignmentTypeRaw}`)
    }

    const dto = new ProcessApplicationDTO({
      application_id: String(params.id),
      action: request.input('action') as 'approve' | 'reject',
      rejection_reason: request.input('rejection_reason') as string | undefined,
      assignment_type: assignmentTypeRaw as 'member' | 'freelancer' | 'volunteer',
      estimated_hours: request.input('estimated_hours') as number | undefined,
    })

    const command = new ProcessApplicationCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'approve' ? 'Application approved successfully' : 'Application rejected'
    session.flash('success', message)

    response.redirect().back()
  }
}
