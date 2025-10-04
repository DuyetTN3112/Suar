import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'

export default class ListReviewDisputeCaseFilesController {
  async handle(ctx: HttpContext) {
    const caseFiles = await new ListReviewDisputeCaseFilesQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params['disputeId'] as string,
    })

    ctx.response.status(HttpStatus.OK)
    return mapReviewCollectionApiBody(caseFiles)
  }
}
