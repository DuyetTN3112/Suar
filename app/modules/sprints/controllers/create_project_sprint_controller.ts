import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeCreateProjectSprintCommand } from '#modules/sprints/bootstrap/sprint_action_factory'
import { mapSprintDataApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

export default class CreateProjectSprintController {
  async handle(ctx: HttpContext) {
    const body = ctx.request.body() as Record<string, unknown>
    const goal = readOptionalString(body['goal'])
    const status = body['status'] as 'draft' | 'active' | undefined
    const result = await makeCreateProjectSprintCommand(actionContextFromHttp(ctx)).execute({
      project_id: ctx.params['projectId'] as string,
      name: readString(body['name']),
      starts_at: readString(body['startsAt'] ?? body['starts_at']),
      ends_at: readString(body['endsAt'] ?? body['ends_at']),
      ...(goal !== undefined ? { goal } : {}),
      ...(status !== undefined ? { status } : {}),
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapSprintDataApiBody(result)
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}
