import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BuildReviewDisputeCaseFileCommand from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'

export default class BuildReviewDisputeCaseFileController {
  async handle(ctx: HttpContext) {
    const caseFile = await new BuildReviewDisputeCaseFileCommand(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params.id as string,
    })

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDataApiBody(caseFile))
  }
}
