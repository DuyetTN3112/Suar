import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'

function validationErrors(err: unknown) {
  return err && typeof err === 'object' && 'messages' in err ? err.messages : err
}

const prefillSchema = vine.compile(
  vine.object({
    project_professional_role_id: vine.string().uuid(),
  })
)

export default class PrefillTaskRequirementsFromRoleController {
  async handle({ params, request, response }: HttpContext) {
    const taskId = String(params.taskId)

    let payload
    try {
      payload = await request.validateUsing(prefillSchema)
    } catch (err) {
      response.unprocessableEntity({ message: 'Validation failed', errors: validationErrors(err) }); return;
    }

    try {
      const result = await TaskSkillRequirementService.prefillFromProjectRole(
        taskId,
        payload.project_professional_role_id
      )
      response.ok({ data: result }); return;
    } catch (err) {
      response.badRequest({ message: String(err) }); return;
    }
  }
}
