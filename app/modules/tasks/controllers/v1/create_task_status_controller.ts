import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'
import { CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const rawName = String(ctx.request.input('name', ''))
    const dto = CreateTaskStatusDTO.fromValidatedPayload(
      {
        name: rawName,
        slug:
          toOptionalString(ctx.request.input('slug')) ??
          rawName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, ''),
        category: toOptionalString(ctx.request.input('group', ctx.request.input('category'))),
        color: toOptionalString(ctx.request.input('color')),
        icon: toOptionalString(ctx.request.input('icon')),
        description: toOptionalString(ctx.request.input('description')),
        sort_order: toOptionalNumber(ctx.request.input('sortOrder', ctx.request.input('sort_order'))),
      },
      organizationId
    )
    const status = await new CreateTaskStatusCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.status(201)
    return mapApiV1TaskStatusResponse(status)
  }
}
