import type { HttpContext } from '@adonisjs/core/http'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
import { throwTaskRequirementBoundaryError } from '#modules/tasks/controllers/v1/support/task_requirement_api_errors'

export default class RemoveTaskRequirementController {
  async handle({ params, response }: HttpContext) {
    const requirementId = String(params['requirementId'])

    try {
      await TaskSkillRequirementService.removeRequirement(requirementId)
      response.noContent()
      return
    } catch (err) {
      throwTaskRequirementBoundaryError(err)
    }
  }
}
