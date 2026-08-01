import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/get_role_requirements_query'

/**
 * GET /api/v1/projects/:projectId/roles/:roleId/requirements
 * Returns the skill requirements for a project professional role.
 * Used at task creation time to prefill requirements before task exists.
 */
@inject()
export default class GetRoleRequirementsController {
  constructor(private readonly query: GetRoleRequirementsQuery) {}

  async handle({ params }: HttpContext) {
    return {
      data: await this.query.handle({
        projectId: String(params['projectId']),
        roleId: String(params['roleId']),
      }),
    }
  }
}
