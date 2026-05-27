import type { HttpContext } from '@adonisjs/core/http'

import { buildResolveReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'

export default class ResolveReviewDisputeController {
  async handle(ctx: HttpContext) {
    const dto = buildResolveReviewDisputeDTO(ctx.request, ctx.params.id as string)
    const dispute = await new ResolveReviewDisputeCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDataApiBody(dispute))
  }
}
