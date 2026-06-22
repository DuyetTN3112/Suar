import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'
import { UpdateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return toOptionalString(value)
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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

export default class UpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = UpdateTaskStatusDTO.fromValidatedPayload(
      {
        name: toOptionalString(ctx.request.input('name')),
        slug: toOptionalString(ctx.request.input('slug')),
        category: toOptionalString(ctx.request.input('group', ctx.request.input('category'))),
        color: toOptionalString(ctx.request.input('color')),
        icon: toOptionalNullableString(ctx.request.input('icon')),
        description: toOptionalNullableString(ctx.request.input('description')),
        sort_order: toOptionalNumber(ctx.request.input('sortOrder', ctx.request.input('sort_order'))),
        is_default: toOptionalBoolean(
          ctx.request.input('isDefault', ctx.request.input('is_default'))
        ),
      },
      {
        organization_id: organizationId,
        status_id: ctx.params.taskStatusId as string,
      }
    )
    const status = await new UpdateTaskStatusDefinitionCommand(actionContextFromHttp(ctx)).execute(
      dto
    )

    return mapApiV1TaskStatusResponse(status)
  }
}
