import type { HttpContext } from '@adonisjs/core/http'
import {
  CreateTaskStatusDTO,
  DeleteTaskStatusDTO,
  UpdateTaskStatusDTO,
  UpdateWorkflowDTO,
} from '#actions/tasks/dtos/request/task_status_dtos'
import { WithdrawApplicationDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import { TaskStatusCategory } from '#constants/task_constants'
import type { DatabaseId } from '#types/database'

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
  organizationId: DatabaseId,
  options: CreateTaskStatusOptions = {}
): CreateTaskStatusDTO {
  const rawName = request.input('name') as string
  const rawSlug = toOptionalString(request.input('slug') as unknown)

  return CreateTaskStatusDTO.fromValidatedPayload(
    {
      name: rawName,
      slug: rawSlug ?? (options.generateSlugFromName ? toSlug(rawName) : ''),
      category:
        toOptionalString(request.input('category') as unknown) ??
        options.defaultCategory ??
        TaskStatusCategory.IN_PROGRESS,
      color:
        toOptionalString(request.input('color') as unknown) ?? options.defaultColor ?? '#6B7280',
      icon: toOptionalString(request.input('icon') as unknown),
      description: toOptionalString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sort_order') as unknown),
    },
    organizationId
  )
}

export function buildOrganizationWorkflowCreateTaskStatusDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId
): CreateTaskStatusDTO {
  return buildCreateTaskStatusDTO(request, organizationId, {
    generateSlugFromName: true,
    defaultCategory: TaskStatusCategory.IN_PROGRESS,
    defaultColor: '#6B7280',
  })
}

export function buildUpdateTaskStatusDefinitionDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  statusId: DatabaseId
): UpdateTaskStatusDTO {
  return UpdateTaskStatusDTO.fromValidatedPayload(
    {
      name: toOptionalString(request.input('name') as unknown),
      slug: toOptionalString(request.input('slug') as unknown),
      category: toOptionalString(request.input('category') as unknown),
      color: toOptionalString(request.input('color') as unknown),
      icon: toOptionalNullableString(request.input('icon') as unknown),
      description: toOptionalNullableString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sort_order') as unknown),
      is_default: toOptionalBoolean(request.input('is_default') as unknown),
    },
    {
      status_id: statusId,
      organization_id: organizationId,
    }
  )
}

export function buildDeleteTaskStatusDTO(
  organizationId: DatabaseId,
  statusId: DatabaseId
): DeleteTaskStatusDTO {
  return DeleteTaskStatusDTO.fromIdentifiers({
    status_id: statusId,
    organization_id: organizationId,
  })
}

export function buildUpdateWorkflowDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId
): UpdateWorkflowDTO {
  return UpdateWorkflowDTO.fromTransitions(
    request.input('transitions', []) as Array<{
      from_status_id: DatabaseId
      to_status_id: DatabaseId
      conditions?: Record<string, unknown>
    }>,
    organizationId
  )
}

export function buildWithdrawApplicationDTO(applicationId: DatabaseId): WithdrawApplicationDTO {
  return WithdrawApplicationDTO.fromApplicationId(applicationId)
}
