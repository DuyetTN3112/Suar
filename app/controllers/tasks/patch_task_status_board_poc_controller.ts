import type { HttpContext } from '@adonisjs/core/http'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { ExecutionContext } from '#types/execution_context'
import PatchTaskStatusBoardPocCommand from '#actions/tasks/commands/patch_task_status_board_poc_command'
import { buildPatchTaskStatusBoardPocInput } from './mappers/request/task_request_mapper.js'

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

    const result = await new PatchTaskStatusBoardPocCommand(ExecutionContext.fromHttp(ctx)).execute(
      buildPatchTaskStatusBoardPocInput(request, organizationId)
    )

    response.status(result.status).json(result.body)
  }
}
