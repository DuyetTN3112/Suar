import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/actions/dtos/request/workflow/organization_task_status_create_input'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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

function requiredName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field('name', 'name is required')
  }
  return value.trim()
}

export function buildCurrentOrganizationWorkflowCreateTaskStatusDTO(
  request: HttpContext['request']
): OrganizationTaskStatusCreateInput {
  const rawName = requiredName(request.input('name'))
  const rawSlug = toOptionalString(request.input('slug') as unknown)

  return omitUndefined({
      name: rawName,
      slug: rawSlug ?? toSlug(rawName),
      category:
        toOptionalString(request.input('group', request.input('category')) as unknown) ??
        TaskStatusCategory.IN_PROGRESS,
      color: toOptionalString(request.input('color') as unknown) ?? '#6B7280',
      icon: toOptionalString(request.input('icon') as unknown),
      description: toOptionalString(request.input('description') as unknown),
      sort_order: toOptionalNumber(request.input('sortOrder', request.input('sort_order')) as unknown),
    })
}
