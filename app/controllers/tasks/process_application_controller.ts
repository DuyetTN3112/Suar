import type { HttpContext } from '@adonisjs/core/http'
import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import { ProcessApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'

function validateAssignmentType(value: string): 'member' | 'freelancer' | 'volunteer' {
  if (['member', 'freelancer', 'volunteer'].includes(value)) {
    return value as 'member' | 'freelancer' | 'volunteer'
  }
  return 'freelancer'
}

/**
 * POST /applications/:id/process → Approve/reject application
 */
export default class ProcessApplicationController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new ProcessApplicationDTO({
        application_id: String(params.id),
        action: request.input('action') as 'approve' | 'reject',
        rejection_reason: request.input('rejection_reason') as string | undefined,
        assignment_type: validateAssignmentType(
          String(request.input('assignment_type', 'freelancer'))
        ),
        estimated_hours: request.input('estimated_hours') as number | undefined,
      })

      const command = new ProcessApplicationCommand(ctx)
      await command.handle(dto)

      const message =
        dto.action === 'approve' ? 'Application approved successfully' : 'Application rejected'
      session.flash('success', message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process application'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }
}
