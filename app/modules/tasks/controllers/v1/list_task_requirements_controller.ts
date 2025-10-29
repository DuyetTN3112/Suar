import type { HttpContext } from '@adonisjs/core/http'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
import { camelizeResponseValue } from '#modules/tasks/controllers/v1/support/camelize_response'
import { throwTaskRequirementBoundaryError } from '#modules/tasks/controllers/v1/support/task_requirement_api_errors'

export default class ListTaskRequirementsController {
  async handle({ params }: HttpContext) {
    const taskId = String(params['taskId'])

    try {
      const requirements = await TaskSkillRequirementService.getRequirements(taskId)

      return {
        data: camelizeResponseValue(requirements.map((requirement) => requirement.serialize())),
      }
    } catch (err) {
      throwTaskRequirementBoundaryError(err)
    }
  }
}
