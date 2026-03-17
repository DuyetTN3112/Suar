import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/close_project_sprint_review_command'

export default class CloseProjectSprintReviewController {
  async handle(ctx: HttpContext) {
    const projectId = ctx.params['projectId'] as string | undefined
    const result = await new CloseProjectSprintReviewCommand(actionContextFromHttp(ctx)).execute({
      sprint_id: ctx.params['sprintId'] as string,
      ...(projectId !== undefined ? { project_id: projectId } : {}),
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
