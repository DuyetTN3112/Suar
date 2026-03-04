import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CloseProjectSprintReviewController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const projectId = ctx.params['projectId'] as string | undefined
    const result = await this.actions
      .makeCloseProjectSprintReviewCommand(actionContextFromHttp(ctx))
      .execute({
        sprint_id: ctx.params['sprintId'] as string,
        ...(projectId !== undefined ? { project_id: projectId } : {}),
      })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
