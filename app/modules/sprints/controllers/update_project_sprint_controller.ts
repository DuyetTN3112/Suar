import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeUpdateProjectSprintCommand } from '#modules/sprints/bootstrap/sprint_action_factory'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'
import type { ProjectSprintCoreStatus } from '#modules/sprints/domain/sprint_core_rules'

export default class UpdateProjectSprintController {
  async handle(ctx: HttpContext) {
    const body = ctx.request.body() as Record<string, unknown>
    const name = typeof body['name'] === 'string' ? body['name'] : undefined
    const goal = body['goal'] === null ? null : typeof body['goal'] === 'string' ? body['goal'] : undefined
    const startsAt =
      typeof body['startsAt'] === 'string'
        ? body['startsAt']
        : typeof body['starts_at'] === 'string'
          ? body['starts_at']
          : undefined
    const endsAt =
      typeof body['endsAt'] === 'string'
        ? body['endsAt']
        : typeof body['ends_at'] === 'string'
          ? body['ends_at']
          : undefined
    const status =
      typeof body['status'] === 'string' ? (body['status'] as ProjectSprintCoreStatus) : undefined
    const result = await makeUpdateProjectSprintCommand(actionContextFromHttp(ctx)).execute({
      project_id: ctx.params['projectId'] as string,
      sprint_id: ctx.params['sprintId'] as string,
      ...(name !== undefined ? { name } : {}),
      ...(goal !== undefined ? { goal } : {}),
      ...(startsAt !== undefined ? { starts_at: startsAt } : {}),
      ...(endsAt !== undefined ? { ends_at: endsAt } : {}),
      ...(status !== undefined ? { status } : {}),
    })

    return mapSprintDataApiBody(result)
  }
}
