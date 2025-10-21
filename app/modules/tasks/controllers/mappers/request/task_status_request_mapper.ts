import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { WithdrawApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import {
  CreateTaskStatusDTO,
  DeleteTaskStatusDTO,
  UpdateTaskStatusDTO,
  UpdateWorkflowDTO,
} from '#modules/tasks/actions/dtos/request/task_status_dtos'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

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

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

interface CreateTaskStatusOptions {
  generateSlugFromName?: boolean
  defaultCategory?: string
  defaultColor?: string
}

export function buildCreateTaskStatusDTO(
  request: HttpContext['request'],
  organizationId: string,
  options: CreateTaskStatusOptions = {}
): CreateTaskStatusDTO {
  const rawName = String(request.input('name', ''))
  const rawSlug = toOptionalString(request.input('slug') as unknown)

  return CreateTaskStatusDTO.fromValidatedPayload(
    omitUndefined({
      name: rawName,
      slug:
        rawSlug ?? ((options.generateSlugFromName ?? true) && rawName.trim().length > 0
          ? toSlug(rawName)
          : ''),
      category:
        toOptionalString(request.input('group', request.input('category')) as unknown) ??
        options.defaultCategory ??
        TaskStatusCategory.IN_PROGRESS,
      color:
        toOptionalString(request.input('color') as unknown) ?? options.defaultColor ?? '#6B7280',
      icon: toOptionalString(request.input('icon') as unknown),
      description: toOptionalString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sortOrder', request.input('sort_order')) as unknown),
    }),
    organizationId
  )
}

export function buildOrganizationWorkflowCreateTaskStatusDTO(
  request: HttpContext['request'],
  organizationId: string
): CreateTaskStatusDTO {
  return buildCreateTaskStatusDTO(request, organizationId, {
    generateSlugFromName: true,
    defaultCategory: TaskStatusCategory.IN_PROGRESS,
    defaultColor: '#6B7280',
  })
}

export function buildUpdateTaskStatusDefinitionDTO(
  request: HttpContext['request'],
  organizationId: string,
  statusId: string
): UpdateTaskStatusDTO {
  return UpdateTaskStatusDTO.fromValidatedPayload(
    omitUndefined({
      name: toOptionalString(request.input('name') as unknown),
      slug: toOptionalString(request.input('slug') as unknown),
      category: toOptionalString(request.input('group', request.input('category')) as unknown),
      color: toOptionalString(request.input('color') as unknown),
      icon: toOptionalNullableString(request.input('icon') as unknown),
      description: toOptionalNullableString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sortOrder', request.input('sort_order')) as unknown),
      is_default: toOptionalBoolean(request.input('isDefault', request.input('is_default')) as unknown),
    }),
    {
      status_id: statusId,
      organization_id: organizationId,
    }
  )
}

export function buildDeleteTaskStatusDTO(
  organizationId: string,
  statusId: string
): DeleteTaskStatusDTO {
  return DeleteTaskStatusDTO.fromIdentifiers({
    status_id: statusId,
    organization_id: organizationId,
  })
}

export function buildUpdateWorkflowDTO(
  request: HttpContext['request'],
  organizationId: string
): UpdateWorkflowDTO {
  const transitionsInput = request.input('transitions', []) as Array<
    | {
        from_status_id: string
        to_status_id: string
        conditions?: Record<string, unknown>
      }
    | {
        fromStatusId: string
        toStatusId: string
        conditions?: Record<string, unknown>
      }
  >

  return UpdateWorkflowDTO.fromTransitions(
    transitionsInput.map((transition) =>
      omitUndefined({
        from_status_id:
          'from_status_id' in transition ? transition.from_status_id : transition.fromStatusId,
        to_status_id:
          'to_status_id' in transition ? transition.to_status_id : transition.toStatusId,
        conditions: transition.conditions,
      })
    ),
    organizationId
  )
}

export function buildWithdrawApplicationDTO(applicationId: string): WithdrawApplicationDTO {
  return WithdrawApplicationDTO.fromApplicationId(applicationId)
}
