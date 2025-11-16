import type { HttpContext } from '@adonisjs/core/http'

import { buildPatchTaskStatusBoardPocInput } from './mappers/request/task_request_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makePatchTaskStatusBoardPocCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /api/tasks/status-board
 * POC endpoint to validate optimistic flow + conflict handling for status board slice.
 */
export default class PatchTaskStatusBoardPocController {
  async handle(ctx: HttpContext) {
    const { response, session, request } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const result = await makePatchTaskStatusBoardPocCommand(actionContextFromHttp(ctx)).execute(
      buildPatchTaskStatusBoardPocInput(request, organizationId)
    )

    response.status(result.status).json(result.body)
  }
}
