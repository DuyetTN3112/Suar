import type { HttpContext } from '@adonisjs/core/http'

import { buildPatchTaskStatusBoardPocInput } from './mappers/request/task_request_mapper.js'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makePatchTaskStatusBoardPocCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /api/tasks/status-board
 * POC endpoint to validate optimistic flow + conflict handling for status board slice.
 */
export default class PatchTaskStatusBoardPocController {
  async handle(ctx: HttpContext) {
    const { response, request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const result = await makePatchTaskStatusBoardPocCommand(actionContextFromHttp(ctx)).execute(
      buildPatchTaskStatusBoardPocInput(request, organizationId)
    )

    response.status(200).json(
      wrapApiV1Data({
        acknowledgedTotal: result.acknowledgedTotal,
      })
    )
  }
}
