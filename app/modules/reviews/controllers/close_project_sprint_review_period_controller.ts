import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CloseProjectSprintReviewPeriodCommand from '#modules/reviews/actions/commands/close_project_sprint_review_period_command'

export default class CloseProjectSprintReviewPeriodController {
  async handle(ctx: HttpContext) {
    const result = await new CloseProjectSprintReviewPeriodCommand(
      actionContextFromHttp(ctx)
    ).execute({
      sprint_id: ctx.params['sprintId'] as string,
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
