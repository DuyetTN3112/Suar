import type { HttpContext } from '@adonisjs/core/http'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'

export default class RemoveTaskRequirementController {
  async handle({ params, response }: HttpContext) {
    const requirementId = String(params.requirementId)

    try {
      await TaskSkillRequirementService.removeRequirement(requirementId)
      response.ok({ message: 'Requirement removed' }); return;
    } catch (err) {
      response.badRequest({ message: String(err) }); return;
    }
  }
}
