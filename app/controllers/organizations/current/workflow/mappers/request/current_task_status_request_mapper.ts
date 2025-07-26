import type { HttpContext } from '@adonisjs/core/http'

import { CreateTaskStatusDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import { TaskStatusCategory } from '#constants/task_constants'
import type { DatabaseId } from '#types/database'

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

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildCurrentOrganizationWorkflowCreateTaskStatusDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId
): CreateTaskStatusDTO {
  const rawName = request.input('name') as string
  const rawSlug = toOptionalString(request.input('slug') as unknown)

  return CreateTaskStatusDTO.fromValidatedPayload(
    {
      name: rawName,
      slug: rawSlug ?? toSlug(rawName),
      category:
        toOptionalString(request.input('category') as unknown) ??
        TaskStatusCategory.IN_PROGRESS,
      color: toOptionalString(request.input('color') as unknown) ?? '#6B7280',
      icon: toOptionalString(request.input('icon') as unknown),
      description: toOptionalString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sort_order') as unknown),
    },
    organizationId
  )
}
