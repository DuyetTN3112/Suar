import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ExpireSprintReviewPackagesCommand from '#modules/reviews/actions/commands/expire_sprint_review_packages_command'

export default class ExpireSprintReviewPackagesController {
  async handle(ctx: HttpContext) {
    const result = await new ExpireSprintReviewPackagesCommand(actionContextFromHttp(ctx)).execute({
      sprint_id: ctx.params['sprintId'] as string,
      reason: (ctx.request.input('reason') as string | null | undefined) ?? null,
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
